import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCreatorFeeRate } from "@/lib/stripe/connect";
import { sendPreorderRefundedEmail } from "@/lib/email/send";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("preorder-cancel", 10);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the preorder and verify ownership
    const { data: preorder } = await supabase
      .from("project_preorders")
      .select("id, project_id, user_id, current_status, stripe_payment_intent_id, amount_cents")
      .eq("id", id)
      .single();

    if (!preorder || preorder.user_id !== user.id) {
      return NextResponse.json({ error: "Preorder not found" }, { status: 404 });
    }

    if (!["active", "committed"].includes(preorder.current_status)) {
      return NextResponse.json(
        { error: "This preorder cannot be cancelled" },
        { status: 400 }
      );
    }

    // Fetch the project
    const { data: project } = await supabase
      .from("projects")
      .select("id, lifecycle_status, title, delivery_deadline, delivered_at")
      .eq("id", preorder.project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Allow cancel in two scenarios:
    // 1. During unlocking (campaign phase) — active preorders
    // 2. After production deadline passes AND project not yet delivered — self-serve refund
    const isUnlocking = project.lifecycle_status === "unlocking" && preorder.current_status === "active";
    const isOverdueRefund =
      project.lifecycle_status === "in_production" &&
      !project.delivered_at &&
      project.delivery_deadline &&
      new Date(project.delivery_deadline) < new Date();

    if (!isUnlocking && !isOverdueRefund) {
      return NextResponse.json(
        { error: "Preorders can only be cancelled during the campaign or after the production deadline passes" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const adminSupabase = createAdminClient();
    const now = new Date().toISOString();

    // Refund via Stripe if there's a payment intent
    if (preorder.stripe_payment_intent_id) {
      try {
        await stripe.refunds.create({
          payment_intent: preorder.stripe_payment_intent_id,
        });
      } catch (stripeErr: unknown) {
        const stripeError = stripeErr as { code?: string };
        if (stripeError.code === "charge_already_refunded") {
          console.warn(`[api] preorder ${id} already refunded in Stripe, continuing`);
        } else {
          throw stripeErr;
        }
      }
    }

    // Update preorder status to cancelled
    const { error: updateError } = await adminSupabase
      .from("project_preorders")
      .update({
        current_status: "cancelled",
        refunded_at: now,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[api] preorder cancel update error:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel preorder" },
        { status: 500 }
      );
    }

    // Record financial events: refund + absorbed Stripe processing fee
    // Stripe fee: 2.9% + 30c domestic, 3.9% + 30c international — using domestic rate as estimate
    const stripeFeeEstimate = Math.round(preorder.amount_cents * 0.029) + 30;

    const { error: eventError } = await adminSupabase
      .from("project_financial_events")
      .insert([
        {
          project_id: preorder.project_id,
          preorder_id: preorder.id,
          event_type: "preorder_refund",
          amount_cents: preorder.amount_cents,
          stripe_object_id: preorder.stripe_payment_intent_id,
        },
        {
          project_id: preorder.project_id,
          preorder_id: preorder.id,
          event_type: "platform_fee_absorbed",
          amount_cents: stripeFeeEstimate,
          stripe_object_id: preorder.stripe_payment_intent_id,
          metadata_json: { reason: "stripe_refund_fee", original_amount: preorder.amount_cents },
        },
      ]);

    if (eventError) {
      console.error("[api] financial event insert error:", eventError);
    }

    // Debit creator balance for overdue refunds (creator was already credited)
    if (isOverdueRefund) {
      const { data: refundProject } = await adminSupabase
        .from("projects")
        .select("creator_id")
        .eq("id", preorder.project_id)
        .single();

      if (refundProject) {
        const feeRate = await getCreatorFeeRate(refundProject.creator_id);
        const platformFee = Math.floor(preorder.amount_cents * feeRate);
        const creatorShare = preorder.amount_cents - platformFee;

        // Atomic debit: uses FOR UPDATE row lock, debits available first then held, floors at 0
        await adminSupabase.rpc("atomic_dispute_debit", {
          p_profile_id: refundProject.creator_id,
          p_amount: creatorShare,
        });

        // Record financial event for the balance debit
        await adminSupabase.from("project_financial_events").insert({
          project_id: preorder.project_id,
          preorder_id: preorder.id,
          event_type: "refund_balance_debit",
          amount_cents: creatorShare,
          stripe_object_id: preorder.stripe_payment_intent_id,
          metadata_json: {
            creator_id: refundProject.creator_id,
          },
        });
      }
    }

    // Send refund confirmation email to the viewer
    try {
      const { data: { user: viewerAuth } } = await adminSupabase.auth.admin.getUserById(user.id);
      if (viewerAuth?.email) {
        sendPreorderRefundedEmail(viewerAuth.email, project.title, preorder.amount_cents);
      }
    } catch (emailErr) {
      console.error("[api] preorder refund email error:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] preorder cancel error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
