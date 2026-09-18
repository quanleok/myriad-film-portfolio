import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import {
  sendProjectUnlockedEmail,
  sendFailedToUnlockEmail,
  sendPreorderRefundedEmail,
} from "@/lib/email/send";
import {
  notifyCreatorFailedToUnlock,
} from "@/lib/notifications";
import {
  MANUAL_GREENLIGHT_THRESHOLD,
  MANUAL_GREENLIGHT_WINDOW_HOURS,
} from "@/types/project";

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return authHeader === `Bearer ${expected}` || cronHeader === expected;
}

async function processCampaignDeadlines() {
  const admin = createAdminClient();
  const stripe = getStripe();

  // Find projects where campaign has ended and still in 'unlocking' state
  const { data: expiredProjects, error: fetchError } = await admin
    .from("projects")
    .select("id, creator_id, title, slug, unlock_target, preorder_count_cache, campaign_ends_at, production_window_days, manual_greenlight_eligible")
    .eq("lifecycle_status", "unlocking")
    .lte("campaign_ends_at", new Date().toISOString());

  if (fetchError) {
    console.error("[cron] campaign-deadline fetch error:", fetchError);
    throw new Error("Fetch failed");
  }

  if (!expiredProjects || expiredProjects.length === 0) {
    return { processed: 0, refunded: 0 };
  }

  let processedCount = 0;
  let refundedCount = 0;

  for (const project of expiredProjects) {
    const didUnlock = project.preorder_count_cache >= (project.unlock_target ?? Infinity);

    if (didUnlock) {
      // Project met target -- unlock it
      await admin.rpc("check_and_unlock_project", { p_project_id: project.id });

      // Record greenlit_at and greenlit_by
      await admin
        .from("projects")
        .update({ greenlit_at: new Date().toISOString(), greenlit_by: "auto" })
        .eq("id", project.id);

      // Credit creator balance (new/proven split)
      await admin.rpc("credit_creator_balance", {
        p_project_id: project.id,
        p_creator_id: project.creator_id,
      });

      // Record status history
      await admin.from("project_status_history").insert({
        project_id: project.id,
        from_status: "unlocking",
        to_status: "in_production",
        reason: "Campaign deadline reached -- target met (auto-greenlight at 100%)",
      });

      // Send unlock emails
      try {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(
          estimatedDelivery.getDate() + (project.production_window_days ?? 60)
        );
        const deliveryStr = estimatedDelivery.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        // Email creator
        const { data: creator } = await admin
          .from("profiles")
          .select("email")
          .eq("id", project.creator_id)
          .single();

        if (creator?.email) {
          await sendProjectUnlockedEmail(
            creator.email,
            project.title,
            project.slug,
            deliveryStr
          );
        }

        // Email all backers
        const { data: backerPreorders } = await admin
          .from("project_preorders")
          .select("user_id")
          .eq("project_id", project.id)
          .in("current_status", ["active", "committed"]);

        if (backerPreorders) {
          const backerIds = [...new Set(backerPreorders.map((p: { user_id: string }) => p.user_id))];
          const { data: backerProfiles } = await admin
            .from("profiles")
            .select("email")
            .in("id", backerIds);

          if (backerProfiles) {
            for (const backer of backerProfiles) {
              if (backer.email) {
                await sendProjectUnlockedEmail(
                  backer.email,
                  project.title,
                  project.slug,
                  deliveryStr
                );
              }
            }
          }
        }
      } catch (emailErr) {
        console.error(`[cron] unlock email error for project ${project.id}:`, emailErr);
      }

      processedCount++;
    } else {
      // Project did not reach 100% by deadline.
      const target = project.unlock_target ?? 0;
      const pct = target > 0 ? project.preorder_count_cache / target : 0;

      if (pct >= MANUAL_GREENLIGHT_THRESHOLD && !project.manual_greenlight_eligible) {
        // 50-99%: Open 48h manual greenlight window for creator
        const windowEnd = new Date();
        windowEnd.setHours(windowEnd.getHours() + MANUAL_GREENLIGHT_WINDOW_HOURS);

        await admin
          .from("projects")
          .update({
            manual_greenlight_eligible: true,
            grace_period_end: windowEnd.toISOString(),
          })
          .eq("id", project.id);

        // Record status history
        await admin.from("project_status_history").insert({
          project_id: project.id,
          from_status: "unlocking",
          to_status: "unlocking",
          reason: `Campaign ended at ${Math.round(pct * 100)}% — 48h manual greenlight window opened`,
        });

        console.log(`[cron] project ${project.id}: opened 48h greenlight window (${Math.round(pct * 100)}%)`);
        processedCount++;
        continue;
      }

      // Project failed: <50%, OR greenlight window was already opened (handled by processExpiredGreenlightWindows)
      // Skip projects that already have an active greenlight window (not yet expired)
      if (project.manual_greenlight_eligible) {
        continue;
      }

      // Auto-fail: <50% at deadline — refund all preorders
      // IMPORTANT: Refund preorders FIRST, then update status.
      // If we crash mid-refund, the project stays "unlocking" and cron retries next run.

      // Fetch active preorders to refund
      const { data: preorders } = await admin
        .from("project_preorders")
        .select("id, stripe_payment_intent_id, amount_cents, user_id")
        .eq("project_id", project.id)
        .in("current_status", ["active", "committed"]);

      if (preorders) {
        for (const preorder of preorders) {
          try {
            // Refund via Stripe
            if (preorder.stripe_payment_intent_id) {
              try {
                await stripe.refunds.create({
                  payment_intent: preorder.stripe_payment_intent_id,
                });
              } catch (stripeErr: unknown) {
                const stripeError = stripeErr as { code?: string };
                if (stripeError.code === "charge_already_refunded") {
                  console.warn(`[cron] preorder ${preorder.id} already refunded in Stripe, continuing`);
                } else {
                  throw stripeErr;
                }
              }
            }

            // Update preorder status
            await admin
              .from("project_preorders")
              .update({
                current_status: "refunded",
                refunded_at: new Date().toISOString(),
              })
              .eq("id", preorder.id);

            // Record financial events: refund + absorbed Stripe processing fee
            const stripeFeeEstimate = Math.round(preorder.amount_cents * 0.029) + 30;
            await admin.from("project_financial_events").insert([
              {
                project_id: project.id,
                preorder_id: preorder.id,
                event_type: "preorder_refund",
                amount_cents: preorder.amount_cents,
              },
              {
                project_id: project.id,
                preorder_id: preorder.id,
                event_type: "platform_fee_absorbed",
                amount_cents: stripeFeeEstimate,
                metadata_json: { reason: "stripe_refund_fee", original_amount: preorder.amount_cents },
              },
            ]);

            // Email backer about refund
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
              console.error(
                `[cron] refund email error for preorder ${preorder.id}:`,
                emailErr
              );
            }

            refundedCount++;
          } catch (refundErr) {
            console.error(
              `[cron] refund error for preorder ${preorder.id}:`,
              refundErr
            );
          }
        }
      }

      // All refunds attempted — NOW mark project as failed
      await admin
        .from("projects")
        .update({
          lifecycle_status: "failed_to_unlock",
          moderation_status: "live",
        })
        .eq("id", project.id);

      // In-app notification for creator
      await notifyCreatorFailedToUnlock(project.creator_id, project.title);

      // Email creator about failure
      try {
        const { data: creator } = await admin
          .from("profiles")
          .select("email")
          .eq("id", project.creator_id)
          .single();

        if (creator?.email) {
          await sendFailedToUnlockEmail(
            creator.email,
            project.title,
            project.slug,
            project.preorder_count_cache ?? 0,
            project.unlock_target ?? 0
          );
        }
      } catch (emailErr) {
        console.error(`[cron] fail email error for project ${project.id}:`, emailErr);
      }

      // Record status history
      await admin.from("project_status_history").insert({
        project_id: project.id,
        from_status: "unlocking",
        to_status: "failed_to_unlock",
        reason: `Campaign ended -- ${project.preorder_count_cache}/${project.unlock_target} preorders`,
      });

      processedCount++;
    }
  }

  return { processed: processedCount, refunded: refundedCount };
}

async function processExpiredGreenlightWindows() {
  const admin = createAdminClient();
  const stripe = getStripe();

  // Find projects where 48h greenlight window has expired without creator action
  const { data: expiredWindows } = await admin
    .from("projects")
    .select("id, creator_id, title, slug, unlock_target, preorder_count_cache")
    .eq("lifecycle_status", "unlocking")
    .eq("manual_greenlight_eligible", true)
    .lte("grace_period_end", new Date().toISOString());

  if (!expiredWindows?.length) return { expired: 0, refunded: 0 };

  let expiredCount = 0;
  let refundedCount = 0;

  for (const project of expiredWindows) {
    // Creator didn't greenlight within 48h — fail and refund
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
                console.warn(`[cron] preorder ${preorder.id} already refunded in Stripe, continuing`);
              } else {
                throw stripeErr;
              }
            }
          }

          await admin
            .from("project_preorders")
            .update({
              current_status: "refunded",
              refunded_at: new Date().toISOString(),
            })
            .eq("id", preorder.id);

          const stripeFeeEstimate = Math.round(preorder.amount_cents * 0.029) + 30;
          await admin.from("project_financial_events").insert([
            {
              project_id: project.id,
              preorder_id: preorder.id,
              event_type: "preorder_refund",
              amount_cents: preorder.amount_cents,
            },
            {
              project_id: project.id,
              preorder_id: preorder.id,
              event_type: "platform_fee_absorbed",
              amount_cents: stripeFeeEstimate,
              metadata_json: { reason: "stripe_refund_fee", original_amount: preorder.amount_cents },
            },
          ]);

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

    // Mark project as failed
    await admin
      .from("projects")
      .update({
        lifecycle_status: "failed_to_unlock",
        moderation_status: "live",
      })
      .eq("id", project.id);

    await notifyCreatorFailedToUnlock(project.creator_id, project.title);

    try {
      const { data: creator } = await admin
        .from("profiles")
        .select("email")
        .eq("id", project.creator_id)
        .single();

      if (creator?.email) {
        await sendFailedToUnlockEmail(
          creator.email,
          project.title,
          project.slug,
          project.preorder_count_cache ?? 0,
          project.unlock_target ?? 0
        );
      }
    } catch (emailErr) {
      console.error(`[cron] fail email error for project ${project.id}:`, emailErr);
    }

    await admin.from("project_status_history").insert({
      project_id: project.id,
      from_status: "unlocking",
      to_status: "failed_to_unlock",
      reason: `48h greenlight window expired — creator did not approve (${project.preorder_count_cache}/${project.unlock_target})`,
    });

    expiredCount++;
  }

  return { expired: expiredCount, refunded: refundedCount };
}

async function checkSeriesCompletion() {
  const admin = createAdminClient();

  // Find series projects in "premiering" state where all episodes should have aired
  const { data: premieringProjects } = await admin
    .from("projects")
    .select("id, creator_id, title, slug, episode_count")
    .eq("lifecycle_status", "premiering")
    .eq("format", "series")
    .not("episode_count", "is", null);

  if (!premieringProjects?.length) return { transitioned: 0 };

  let transitioned = 0;

  for (const project of premieringProjects) {
    const { data: episodes } = await admin
      .from("project_episodes")
      .select("id, premiere_scheduled_at, premiere_ended")
      .eq("project_id", project.id);

    if (!episodes || episodes.length < (project.episode_count ?? 0)) continue;

    const allPremiered = episodes.every((ep: { premiere_ended: boolean; premiere_scheduled_at: string | null }) => {
      if (ep.premiere_ended) return true;
      if (ep.premiere_scheduled_at && new Date(ep.premiere_scheduled_at) <= new Date()) return true;
      return false;
    });

    if (!allPremiered) continue;

    // Transition to released
    await admin
      .from("projects")
      .update({ lifecycle_status: "released" })
      .eq("id", project.id);

    // Mark all episodes as premiere_ended
    await admin
      .from("project_episodes")
      .update({ premiere_ended: true })
      .eq("project_id", project.id);

    // Record status history
    await admin.from("project_status_history").insert({
      project_id: project.id,
      from_status: "premiering",
      to_status: "released",
      reason: "All episodes have premiered — series released",
    });

    transitioned++;
  }

  return { transitioned };
}

// Vercel Cron calls GET
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [campaignResult, greenlightResult, seriesResult] = await Promise.all([
      processCampaignDeadlines(),
      processExpiredGreenlightWindows(),
      checkSeriesCompletion(),
    ]);
    return NextResponse.json({
      ...campaignResult,
      greenlight_windows_expired: greenlightResult.expired,
      greenlight_refunds: greenlightResult.refunded,
      series_transitioned: seriesResult.transitioned,
    });
  } catch (err) {
    console.error("[cron] campaign-deadline error:", err);
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
    const [campaignResult, greenlightResult, seriesResult] = await Promise.all([
      processCampaignDeadlines(),
      processExpiredGreenlightWindows(),
      checkSeriesCompletion(),
    ]);
    return NextResponse.json({
      ...campaignResult,
      greenlight_windows_expired: greenlightResult.expired,
      greenlight_refunds: greenlightResult.refunded,
      series_transitioned: seriesResult.transitioned,
    });
  } catch (err) {
    console.error("[cron] campaign-deadline error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
