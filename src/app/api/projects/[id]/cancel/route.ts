import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { sendPreorderRefundedEmail } from "@/lib/email/send";
import { removeProjectFromIndex } from "@/lib/meilisearch/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-cancel", 5);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Fetch the project and verify ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status, moderation_status, title")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Cannot cancel projects in terminal state or after greenlight
    const blockedStatuses = ["released", "cancelled", "failed_to_unlock", "in_production", "premiering"];
    if (blockedStatuses.includes(project.lifecycle_status)) {
      return NextResponse.json(
        { error: "Cannot cancel a project after greenlight" },
        { status: 400 }
      );
    }

    // Build update payload
    const updates: Record<string, unknown> = {
      lifecycle_status: "cancelled",
    };

    // If the project was actively unlocking, also suspend it
    if (project.lifecycle_status === "unlocking") {
      updates.moderation_status = "suspended";
    }

    // Update the project
    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[api] project cancel error:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel project" },
        { status: 500 }
      );
    }

    // Insert status history via admin client (bypasses RLS)
    const adminSupabase = createAdminClient();
    const { error: historyError } = await adminSupabase
      .from("project_status_history")
      .insert({
        project_id: id,
        from_status: project.lifecycle_status,
        to_status: "cancelled",
        reason: "Creator cancelled the project",
        actor_user_id: user.id,
      });

    if (historyError) {
      console.error("[api] status history insert error:", historyError);
    }

    // Refund all active preorders
    const { data: preorders } = await adminSupabase
      .from("project_preorders")
      .select("id, user_id, stripe_payment_intent_id, amount_cents, current_status")
      .eq("project_id", id)
      .in("current_status", ["confirmed", "active", "committed"]);

    if (preorders && preorders.length > 0) {
      const stripe = getStripe();
      const failedRefunds: string[] = [];
      for (const preorder of preorders) {
        try {
          let refundId: string | undefined;
          try {
            const refund = await stripe.refunds.create({
              payment_intent: preorder.stripe_payment_intent_id,
            });
            refundId = refund.id;
          } catch (stripeErr: unknown) {
            const stripeError = stripeErr as { code?: string };
            if (stripeError.code === "charge_already_refunded") {
              console.warn(`[api] preorder ${preorder.id} already refunded in Stripe, continuing`);
            } else {
              throw stripeErr;
            }
          }

          await adminSupabase
            .from("project_preorders")
            .update({
              current_status: "refunded",
              refunded_at: new Date().toISOString(),
            })
            .eq("id", preorder.id);

          await adminSupabase
            .from("project_financial_events")
            .insert({
              project_id: id,
              preorder_id: preorder.id,
              event_type: "preorder_refund",
              amount_cents: preorder.amount_cents,
              stripe_object_id: refundId ?? preorder.stripe_payment_intent_id,
            });
        } catch (refundErr) {
          console.error(
            `[api] refund failed for preorder ${preorder.id}:`,
            refundErr
          );
          failedRefunds.push(preorder.id);
        }
      }

      if (failedRefunds.length > 0) {
        // Some refunds failed — report error so admin can manually resolve
        console.error(`[api] CRITICAL: ${failedRefunds.length}/${preorders.length} refunds failed for project ${id}. IDs: ${failedRefunds.join(", ")}`);
        return NextResponse.json(
          { error: `Project cancelled but ${failedRefunds.length} refund(s) failed. Admin must resolve manually.`, failedRefunds },
          { status: 207 }
        );
      }

      // Update cached preorder count — only if all refunds succeeded
      await adminSupabase
        .from("projects")
        .update({ preorder_count_cache: 0 })
        .eq("id", id);

      // Send refund emails to all affected backers
      try {
        const backerIds = [...new Set(preorders.map((p: { user_id: string }) => p.user_id))];
        const { data: backerProfiles } = await adminSupabase
          .from("profiles")
          .select("id, email")
          .in("id", backerIds);

        if (backerProfiles) {
          const amountByUser = new Map<string, number>();
          for (const p of preorders) {
            amountByUser.set(p.user_id, (amountByUser.get(p.user_id) ?? 0) + p.amount_cents);
          }

          for (const backer of backerProfiles) {
            if (backer.email) {
              sendPreorderRefundedEmail(backer.email, project.title, amountByUser.get(backer.id) ?? 0);
            }
          }
        }
      } catch (emailErr) {
        console.error("[api] cancel refund email error:", emailErr);
      }
    }

    // Remove from Meilisearch (cancelled projects not searchable)
    removeProjectFromIndex(id);

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
