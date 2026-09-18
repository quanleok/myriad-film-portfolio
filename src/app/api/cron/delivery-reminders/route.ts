import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { sendDeliveryReminderEmail, sendPreorderRefundedEmail } from "@/lib/email/send";
import { notifyCreatorDeliveryReminder } from "@/lib/notifications";

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return authHeader === `Bearer ${expected}` || cronHeader === expected;
}

async function processDeliveryReminders() {
  const admin = createAdminClient();
  const now = new Date();

  // Remind creators at 14, 7, and 1 day before estimated_delivery_at
  const reminderWindows = [
    { daysOut: 14, label: "14 days until delivery deadline" },
    { daysOut: 7, label: "7 days until delivery deadline" },
    { daysOut: 1, label: "1 day until delivery deadline" },
  ];

  let notificationsSent = 0;

  for (const { daysOut, label } of reminderWindows) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysOut);

    // Find projects with estimated_delivery_at on this target day
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: projects } = await admin
      .from("projects")
      .select("id, creator_id, title, slug, estimated_delivery_at")
      .eq("lifecycle_status", "in_production")
      .gte("estimated_delivery_at", dayStart.toISOString())
      .lte("estimated_delivery_at", dayEnd.toISOString());

    if (projects) {
      for (const project of projects) {
        // Check if we already sent this reminder (avoid duplicates)
        const { count } = await admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", project.creator_id)
          .eq("type", "delivery_reminder")
          .eq("title", label)
          .gte("created_at", dayStart.toISOString());

        if (count && count > 0) continue;

        // In-app notification
        await notifyCreatorDeliveryReminder(
          project.creator_id,
          project.title,
          daysOut
        );

        // Send email to creator
        try {
          const { data: creator } = await admin
            .from("profiles")
            .select("email")
            .eq("id", project.creator_id)
            .single();

          if (creator?.email) {
            await sendDeliveryReminderEmail(
              creator.email,
              project.title,
              project.slug,
              daysOut
            );
          }
        } catch (emailErr) {
          console.error(
            `[cron] delivery reminder email error for project ${project.id}:`,
            emailErr
          );
        }

        notificationsSent++;
      }
    }
  }

  // Flag overdue projects (past estimated_delivery_at, not yet flagged)
  const { data: overdueProjects } = await admin
    .from("projects")
    .select("id, creator_id, title")
    .eq("lifecycle_status", "in_production")
    .eq("moderation_status", "live")
    .lt("estimated_delivery_at", now.toISOString());

  if (overdueProjects) {
    for (const project of overdueProjects) {
      await admin
        .from("projects")
        .update({ moderation_status: "flagged" })
        .eq("id", project.id)
        .eq("moderation_status", "live");

      await admin.from("notifications").insert({
        user_id: project.creator_id,
        type: "delivery_overdue",
        title: "Project overdue",
        body: `Your project "${project.title}" is past its delivery deadline. Please deliver soon or contact support.`,
        link: `/dashboard`,
      });
      notificationsSent++;
    }
  }

  // Grace period expiry (14 days after deadline): strike + auto-refund all preorders
  const nowIso = now.toISOString();
  let strikesIssued = 0;
  let refundedCount = 0;
  const stripe = getStripe();

  const { data: graceExpired } = await admin
    .from("projects")
    .select("id, creator_id, title")
    .eq("lifecycle_status", "in_production")
    .eq("is_overdue", false)
    .not("grace_period_end", "is", null)
    .lte("grace_period_end", nowIso);

  if (graceExpired) {
    for (const project of graceExpired) {
      // Mark project overdue + cancelled
      await admin
        .from("projects")
        .update({
          is_overdue: true,
          lifecycle_status: "cancelled",
        })
        .eq("id", project.id);

      // Issue strike
      await admin.rpc("increment_strike_count", {
        p_profile_id: project.creator_id,
      });

      const { data: creatorProfile } = await admin
        .from("profiles")
        .select("strike_count, available_balance_cents, held_balance_cents")
        .eq("id", project.creator_id)
        .single();

      if (creatorProfile && creatorProfile.strike_count >= 3) {
        await admin
          .from("profiles")
          .update({ creator_good_standing: false })
          .eq("id", project.creator_id);
      }

      // Auto-refund all active preorders
      const { data: preorders } = await admin
        .from("project_preorders")
        .select("id, stripe_payment_intent_id, amount_cents, user_id")
        .eq("project_id", project.id)
        .in("current_status", ["active", "committed"]);

      if (preorders) {
        for (const preorder of preorders) {
          try {
            if (preorder.stripe_payment_intent_id) {
              try {
                await stripe.refunds.create({
                  payment_intent: preorder.stripe_payment_intent_id,
                });
              } catch (stripeErr: unknown) {
                const stripeError = stripeErr as { code?: string };
                if (stripeError.code === "charge_already_refunded") {
                  console.warn(`[cron] preorder ${preorder.id} already refunded`);
                } else {
                  throw stripeErr;
                }
              }
            }

            await admin
              .from("project_preorders")
              .update({
                current_status: "refunded",
                refunded_at: nowIso,
              })
              .eq("id", preorder.id);

            // Record financial events
            await admin.from("project_financial_events").insert([
              {
                project_id: project.id,
                preorder_id: preorder.id,
                event_type: "preorder_refund",
                amount_cents: preorder.amount_cents,
                metadata_json: { reason: "grace_period_expired" },
              },
            ]);

            // Email backer
            try {
              const { data: backerProfile } = await admin
                .from("profiles")
                .select("email")
                .eq("id", preorder.user_id)
                .single();

              if (backerProfile?.email) {
                await sendPreorderRefundedEmail(
                  backerProfile.email,
                  project.title,
                  preorder.amount_cents
                );
              }
            } catch (emailErr) {
              console.error(`[cron] refund email error for preorder ${preorder.id}:`, emailErr);
            }

            refundedCount++;
          } catch (refundErr) {
            console.error(`[cron] refund error for preorder ${preorder.id}:`, refundErr);
          }
        }
      }

      // Reverse creator balance for this project
      // credit_creator_balance RPC records a "platform_fee" event with creator_share in metadata
      const { data: balanceEvents } = await admin
        .from("project_financial_events")
        .select("metadata_json")
        .eq("project_id", project.id)
        .eq("event_type", "platform_fee");

      if (balanceEvents && balanceEvents.length > 0) {
        const totalCredited = balanceEvents.reduce((sum, ev) => {
          const meta = ev.metadata_json as Record<string, number> | null;
          return sum + (meta?.creator_share ?? 0);
        }, 0);

        if (totalCredited > 0) {
          // Atomic debit: available first, then held, with row lock
          await admin.rpc("atomic_dispute_debit", {
            p_profile_id: project.creator_id,
            p_amount: totalCredited,
          });

          await admin.from("project_financial_events").insert({
            project_id: project.id,
            event_type: "creator_balance_reversal",
            amount_cents: totalCredited,
            metadata_json: { reason: "grace_period_expired_cancellation" },
          });
        }
      }

      // Mark payout releases as cancelled
      await admin
        .from("project_payout_releases")
        .update({ status: "cancelled" })
        .eq("project_id", project.id)
        .in("status", ["pending", "available"]);

      // Record status history
      await admin.from("project_status_history").insert({
        project_id: project.id,
        from_status: "in_production",
        to_status: "cancelled",
        reason: "Grace period expired — all preorders refunded, strike issued",
        actor_user_id: null,
      });

      await admin.from("notifications").insert({
        user_id: project.creator_id,
        type: "delivery_overdue_strike",
        title: "Project cancelled — delivery overdue",
        body: `Your project "${project.title}" has been cancelled because it was not delivered within the grace period. All backers have been refunded and a strike has been added to your account.`,
        link: `/dashboard`,
      });

      strikesIssued++;
      notificationsSent++;
    }
  }

  return {
    notificationsSent,
    overdueCount: overdueProjects?.length ?? 0,
    strikesIssued,
    refundedCount,
  };
}

// Vercel Cron calls GET
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processDeliveryReminders();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] delivery-reminders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Manual trigger via POST
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processDeliveryReminders();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] delivery-reminders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
