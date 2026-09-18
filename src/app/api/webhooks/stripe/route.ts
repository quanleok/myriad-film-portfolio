import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { constructEvent } from "@/lib/stripe/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPreorderConfirmationEmail,
  sendProjectUnlockedEmail,
} from "@/lib/email/send";
import { getCreatorFeeRate } from "@/lib/stripe/connect";
import { getOpportunityListingFeeCents } from "@/lib/opportunities-server";


const ok = NextResponse.json({ received: true });

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = constructEvent(body, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Replay protection: reject events older than 72 hours (Stripe retries up to 72h)
  const eventAge = Math.floor(Date.now() / 1000) - event.created;
  if (eventAge > 259200) {
    console.warn(`[webhook] rejected stale event ${event.id} (age: ${eventAge}s)`);
    return NextResponse.json(
      { error: "Event too old" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // ── Webhook event deduplication (atomic) ──
  // Insert first — if the event_id PK already exists, we get an error and skip.
  // This is atomic and avoids the TOCTOU race of check-then-insert.
  const { error: dedupErr } = await supabase
    .from("processed_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });

  if (dedupErr) {
    // Duplicate key → already processed. Return 200 so Stripe stops retrying.
    return ok;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type !== "opportunity_listing") {
        break;
      }

      const listingId = session.metadata.listing_id;
      if (!listingId) {
        console.error("[webhook] missing opportunity listing_id metadata:", session.id);
        break;
      }

      if (session.payment_status !== "paid") {
        console.warn(
          `[webhook] opportunity checkout completed without paid status: ${session.id} (${session.payment_status})`
        );
        break;
      }

      const listingFeeCents =
        typeof session.amount_total === "number" && session.amount_total > 0
          ? session.amount_total
          : getOpportunityListingFeeCents();

      const { error: updateError } = await supabase
        .from("opportunity_listings")
        .update({
          status: "pending_review",
          stripe_checkout_session_id: session.id,
          stripe_payment_status: session.payment_status ?? "paid",
          listing_fee_cents: listingFeeCents,
          paid_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) {
        console.error("[webhook] opportunity payment update error:", updateError);
      }

      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const {
        viewer_id,
        type: piType,
        project_id: piProjectId,
        creator_id: piCreatorId,
      } = paymentIntent.metadata;

      // ── Preorder payments ──
      if (piType === "preorder" && piProjectId && viewer_id && piCreatorId) {
        // Verify project exists and is accepting preorders
        const { data: piProject } = await supabase
          .from("projects")
          .select("id, lifecycle_status, preorder_price_cents, creator_id")
          .eq("id", piProjectId)
          .single();

        if (!piProject) {
          console.error("[webhook] preorder project not found:", piProjectId);
          // Refund — project gone, can't fulfill
          try {
            const { getStripe } = await import("@/lib/stripe/client");
            await getStripe().refunds.create({ payment_intent: paymentIntent.id });
            console.warn(`[webhook] refunded orphan preorder PI ${paymentIntent.id}`);
          } catch (refundErr) {
            console.error(`[webhook] CRITICAL: failed to refund orphan preorder PI ${paymentIntent.id}:`, refundErr);
          }
          break;
        }

        // Only accept preorders for unlocking or in_production projects
        if (!["unlocking", "in_production"].includes(piProject.lifecycle_status)) {
          console.error(`[webhook] preorder rejected — project ${piProjectId} is ${piProject.lifecycle_status}, not accepting preorders`);
          // Refund — project no longer accepting preorders
          try {
            const { getStripe } = await import("@/lib/stripe/client");
            await getStripe().refunds.create({ payment_intent: paymentIntent.id });
            console.warn(`[webhook] refunded rejected preorder PI ${paymentIntent.id} (project ${piProject.lifecycle_status})`);
          } catch (refundErr) {
            console.error(`[webhook] CRITICAL: failed to refund rejected preorder PI ${paymentIntent.id}:`, refundErr);
          }
          break;
        }

        // Check creator not banned
        const { data: piCreator } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", piCreatorId)
          .single();

        if (piCreator?.is_banned) {
          console.error("[webhook] preorder rejected — creator is banned");
          // Refund — creator banned, can't fulfill
          try {
            const { getStripe } = await import("@/lib/stripe/client");
            await getStripe().refunds.create({ payment_intent: paymentIntent.id });
            console.warn(`[webhook] refunded banned-creator preorder PI ${paymentIntent.id}`);
          } catch (refundErr) {
            console.error(`[webhook] CRITICAL: failed to refund banned-creator preorder PI ${paymentIntent.id}:`, refundErr);
          }
          break;
        }

        const preorderAmount = paymentIntent.amount;

        // Defense-in-depth: validate amount matches project price
        if (preorderAmount !== piProject.preorder_price_cents) {
          console.error(`[webhook] amount mismatch: PI ${paymentIntent.id} amount=${preorderAmount}, project price=${piProject.preorder_price_cents}`);
          try {
            const { getStripe } = await import("@/lib/stripe/client");
            await getStripe().refunds.create({ payment_intent: paymentIntent.id });
          } catch (refundErr) {
            console.error(`[webhook] CRITICAL: failed to refund mismatched PI ${paymentIntent.id}:`, refundErr);
          }
          break;
        }

        const isLatePreorder = piProject.lifecycle_status === "in_production";

        // Insert preorder record (atomic — unique constraint on project_id+user_id)
        const { data: insertedPreorder, error: preorderInsertErr } = await supabase
          .from("project_preorders")
          .insert({
            project_id: piProjectId,
            user_id: viewer_id,
            amount_cents: preorderAmount,
            currency: "usd",
            stripe_payment_intent_id: paymentIntent.id,
            current_status: piProject.lifecycle_status === "unlocking" ? "active" : "committed",
          })
          .select("id")
          .single();

        if (preorderInsertErr) {
          console.error("[webhook] preorder insert failed (likely duplicate):", preorderInsertErr);
          // Refund the PaymentIntent so the viewer isn't charged for a failed insert
          try {
            const { getStripe } = await import("@/lib/stripe/client");
            await getStripe().refunds.create({ payment_intent: paymentIntent.id });
            console.warn(`[webhook] refunded duplicate preorder PI ${paymentIntent.id} for project ${piProjectId}`);
          } catch (refundErr) {
            console.error(`[webhook] CRITICAL: failed to refund duplicate preorder PI ${paymentIntent.id}:`, refundErr);
          }
          break;
        }

        // Record financial event
        await supabase.from("project_financial_events").insert({
          project_id: piProjectId,
          preorder_id: insertedPreorder?.id ?? null,
          event_type: isLatePreorder ? "late_preorder_charge" : "preorder_charge",
          amount_cents: preorderAmount,
          stripe_object_id: paymentIntent.id,
        });

        // Credit creator for late preorders (during in_production) — same split as regular
        if (isLatePreorder) {
          await supabase.rpc("credit_late_preorder", {
            p_project_id: piProjectId,
            p_creator_id: piCreatorId,
            p_amount_cents: preorderAmount,
          });
        }

        // Check if project should unlock (only if still in 'unlocking')
        if (piProject.lifecycle_status === "unlocking") {
          const { data: didUnlock } = await supabase.rpc("check_and_unlock_project", {
            p_project_id: piProjectId,
          });

          if (didUnlock) {
            // Credit creator balance (new/proven split)
            const { data: unlockProject } = await supabase
              .from("projects")
              .select("creator_id")
              .eq("id", piProjectId)
              .single();

            if (unlockProject) {
              await supabase.rpc("credit_creator_balance", {
                p_project_id: piProjectId,
                p_creator_id: unlockProject.creator_id,
              });
            }

            // Record status change
            await supabase.from("project_status_history").insert({
              project_id: piProjectId,
              from_status: "unlocking",
              to_status: "in_production",
              reason: "Unlock target reached",
            });

            // Send unlock emails to creator and all backers
            try {
              const { data: unlockEmailProject } = await supabase
                .from("projects")
                .select("title, slug, estimated_delivery_at, creator_id")
                .eq("id", piProjectId)
                .single();

              if (unlockEmailProject) {
                const estimatedDelivery = unlockEmailProject.estimated_delivery_at
                  ? new Date(unlockEmailProject.estimated_delivery_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : "TBD";
                const slug = unlockEmailProject.slug ?? piProjectId;

                // Email creator
                const { data: unlockCreatorAuth } = await supabase.auth.admin.getUserById(unlockEmailProject.creator_id);
                if (unlockCreatorAuth?.user?.email) {
                  sendProjectUnlockedEmail(unlockCreatorAuth.user.email, unlockEmailProject.title, slug, estimatedDelivery);
                }

                // Email all backers
                const { data: unlockBackers } = await supabase
                  .from("project_preorders")
                  .select("user_id")
                  .eq("project_id", piProjectId)
                  .in("current_status", ["active", "committed"]);

                if (unlockBackers && unlockBackers.length > 0) {
                  const backerIds = [...new Set(unlockBackers.map((p: { user_id: string }) => p.user_id))];
                  const { data: backerProfiles } = await supabase
                    .from("profiles")
                    .select("id, email")
                    .in("id", backerIds);

                  if (backerProfiles) {
                    for (const backer of backerProfiles) {
                      if (backer.email) {
                        sendProjectUnlockedEmail(backer.email, unlockEmailProject.title, slug, estimatedDelivery);
                      }
                    }
                  }
                }
              }
            } catch (unlockEmailErr) {
              console.error("[webhook] unlock email error:", unlockEmailErr);
            }
          }
        }

        // Send preorder confirmation email to buyer
        try {
          const { data: { user: buyerUser } } = await supabase.auth.admin.getUserById(viewer_id);
          if (buyerUser?.email) {
            const { data: emailProject } = await supabase
              .from("projects")
              .select("title, slug, unlock_target, preorder_count_cache")
              .eq("id", piProjectId)
              .single();
            if (emailProject) {
              sendPreorderConfirmationEmail(
                buyerUser.email,
                emailProject.title,
                preorderAmount,
                emailProject.slug ?? piProjectId,
                emailProject.unlock_target ?? 0,
                emailProject.preorder_count_cache ?? 0
              );
            }
          }
        } catch (emailErr) {
          console.error("[webhook] preorder confirmation email failed:", emailErr);
        }

        break;
      }

      // ── Post-release purchase payments ──
      if (piType === "post_release_purchase" && piProjectId && viewer_id) {
        const purchaseAmount = paymentIntent.amount;

        // Record purchase (unique constraint on project_id+user_id prevents duplicates)
        const { error: purchaseInsertErr } = await supabase.from("post_release_purchases").insert({
          project_id: piProjectId,
          user_id: viewer_id,
          amount_cents: purchaseAmount,
          payment_intent_id: paymentIntent.id,
        });

        if (purchaseInsertErr) {
          console.error("[webhook] purchase insert failed (likely duplicate):", purchaseInsertErr);
          try {
            const { getStripe } = await import("@/lib/stripe/client");
            await getStripe().refunds.create({ payment_intent: paymentIntent.id });
            console.warn(`[webhook] refunded duplicate purchase PI ${paymentIntent.id} for project ${piProjectId}`);
          } catch (refundErr) {
            console.error(`[webhook] CRITICAL: failed to refund duplicate purchase PI ${paymentIntent.id}:`, refundErr);
          }
          break;
        }

        // Create entitlement if film is delivered
        const { data: purchaseProject } = await supabase
          .from("projects")
          .select("film_video_id, creator_id")
          .eq("id", piProjectId)
          .single();

        if (purchaseProject?.film_video_id) {
          const { error: entErr } = await supabase.from("project_entitlements").insert({
            project_id: piProjectId,
            user_id: viewer_id,
            video_id: purchaseProject.film_video_id,
            source_type: "purchase",
          });
          if (entErr) {
            console.error(`[webhook] CRITICAL: entitlement insert failed for purchase PI ${paymentIntent.id}:`, entErr);
          }
        }

        // Credit creator — branch on launch_mode
        if (purchaseProject) {
          const feeRate = await getCreatorFeeRate(purchaseProject.creator_id);
          const platformFee = Math.floor(purchaseAmount * feeRate);
          const creatorShare = purchaseAmount - platformFee;

          // Fetch launch_mode to determine payout timing
          const { data: purchaseLaunchInfo } = await supabase
            .from("projects")
            .select("launch_mode, lifecycle_status")
            .eq("id", piProjectId)
            .single();

          const launchMode = purchaseLaunchInfo?.launch_mode ?? "preorder";

          if (launchMode === "direct_premiere" && purchaseLaunchInfo?.lifecycle_status === "premiering") {
            // Direct premiere: hold until released
            const { error: heldErr } = await supabase.rpc("increment_held_balance", {
              p_profile_id: purchaseProject.creator_id,
              p_amount: creatorShare,
            });
            if (heldErr) {
              console.error(`[webhook] CRITICAL: increment_held_balance failed for PI ${paymentIntent.id}:`, heldErr);
            }
          } else {
            // Direct release, preorder, or already released: immediate to available
            const { error: availErr } = await supabase.rpc("increment_available_balance", {
              p_profile_id: purchaseProject.creator_id,
              p_amount: creatorShare,
            });
            if (availErr) {
              console.error(`[webhook] CRITICAL: increment_available_balance failed for PI ${paymentIntent.id}:`, availErr);
            }
          }

          // Record financial events
          const { error: feErr } = await supabase.from("project_financial_events").insert([
            {
              project_id: piProjectId,
              event_type: "post_release_sale",
              amount_cents: purchaseAmount,
              stripe_object_id: paymentIntent.id,
            },
            {
              project_id: piProjectId,
              event_type: "platform_fee",
              amount_cents: platformFee,
              stripe_object_id: paymentIntent.id,
            },
          ]);
          if (feErr) {
            console.error(`[webhook] financial event insert failed for PI ${paymentIntent.id}:`, feErr);
          }
        }

        break;
      }

      // Unrecognized payment_intent — log and ignore
      console.warn(`[webhook] unhandled payment_intent.succeeded: type=${piType}`);
      break;
    }

    // ── Dispute (chargeback) handling ──
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

      // Find the preorder or purchase linked to this charge
      const paymentIntentId = typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id;

      if (!paymentIntentId) {
        console.warn("[webhook] dispute missing payment_intent:", dispute.id);
        break;
      }

      // Check preorders first
      const { data: disputedPreorder } = await supabase
        .from("project_preorders")
        .select("id, project_id, user_id, amount_cents")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .single();

      const disputeUserId = disputedPreorder?.user_id ?? null;
      const disputeProjectId = disputedPreorder?.project_id ?? null;

      // If not a preorder, check post-release purchases
      let purchaseUserId: string | null = null;
      let purchaseProjectId: string | null = null;
      if (!disputedPreorder) {
        const { data: disputedPurchase } = await supabase
          .from("post_release_purchases")
          .select("id, project_id, user_id, amount_cents")
          .eq("payment_intent_id", paymentIntentId)
          .single();

        if (disputedPurchase) {
          purchaseUserId = disputedPurchase.user_id;
          purchaseProjectId = disputedPurchase.project_id;
        }
      }

      const affectedUserId = disputeUserId ?? purchaseUserId;
      const affectedProjectId = disputeProjectId ?? purchaseProjectId;

      if (affectedUserId) {
        // Mark preorder/purchase as disputed
        if (disputedPreorder) {
          await supabase
            .from("project_preorders")
            .update({ current_status: "disputed" })
            .eq("id", disputedPreorder.id);
        } else if (purchaseProjectId && purchaseUserId) {
          await supabase
            .from("post_release_purchases")
            .delete()
            .eq("project_id", purchaseProjectId)
            .eq("user_id", purchaseUserId);
        }

        // Revoke entitlement for this project
        if (affectedProjectId) {
          await supabase
            .from("project_entitlements")
            .delete()
            .eq("project_id", affectedProjectId)
            .eq("user_id", affectedUserId);
        }

        // Atomic: increment dispute_count, flag, freeze if 2+
        const { data: newDisputeCount } = await supabase.rpc("increment_dispute_count", {
          p_user_id: affectedUserId,
        });

        if (newDisputeCount && newDisputeCount >= 2) {
          console.warn(`[webhook] account frozen due to ${newDisputeCount} disputes: ${affectedUserId}`);
        }

        // Debit creator balance (chargeback reverses the payment)
        if (affectedProjectId) {
          const { data: chargebackProject } = await supabase
            .from("projects")
            .select("creator_id")
            .eq("id", affectedProjectId)
            .single();

          if (chargebackProject) {
            const feeRate = await getCreatorFeeRate(chargebackProject.creator_id);
            const platformFee = Math.floor(dispute.amount * feeRate);
            const creatorShare = dispute.amount - platformFee;

            // Atomic debit: available first, then held, with floor at 0
            await supabase.rpc("atomic_dispute_debit", {
              p_profile_id: chargebackProject.creator_id,
              p_amount: creatorShare,
            });
          }

          // Record financial event
          await supabase.from("project_financial_events").insert({
            project_id: affectedProjectId,
            preorder_id: disputedPreorder?.id ?? null,
            event_type: "dispute_chargeback",
            amount_cents: dispute.amount,
            stripe_object_id: chargeId ?? dispute.id,
            metadata_json: {
              dispute_id: dispute.id,
              reason: dispute.reason,
              user_id: affectedUserId,
            },
          });
        }
      }

      console.log(`[webhook] dispute processed: ${dispute.id}, user: ${affectedUserId}, project: ${affectedProjectId}`);
      break;
    }

    // ── Dispute resolved ──
    case "charge.dispute.closed": {
      const closedDispute = event.data.object as Stripe.Dispute;
      const closedPiId = typeof closedDispute.payment_intent === "string"
        ? closedDispute.payment_intent
        : closedDispute.payment_intent?.id;

      // If dispute was won (resolved in our favor), reverse the debit
      if (closedDispute.status === "won" && closedPiId) {
        // Find the original chargeback event to know how much was debited
        const { data: chargebackEvent } = await supabase
          .from("project_financial_events")
          .select("project_id, amount_cents, metadata_json")
          .eq("event_type", "dispute_chargeback")
          .eq("stripe_object_id", closedDispute.id)
          .single();

        if (chargebackEvent) {
          // Find the project's creator to re-credit
          const { data: proj } = await supabase
            .from("projects")
            .select("creator_id")
            .eq("id", chargebackEvent.project_id)
            .single();

          if (proj) {
            const feeRate = await getCreatorFeeRate(proj.creator_id);
            const platformFee = Math.floor(chargebackEvent.amount_cents * feeRate);
            const creatorShare = chargebackEvent.amount_cents - platformFee;
            const creatorId = (chargebackEvent.metadata_json as Record<string, string>)?.user_id;
            await supabase.rpc("increment_available_balance", {
              p_profile_id: proj.creator_id,
              p_amount: creatorShare,
            });

            // Re-grant entitlement if user_id is known
            if (creatorId && chargebackEvent.project_id) {
              const { data: projVideo } = await supabase
                .from("projects")
                .select("film_video_id")
                .eq("id", chargebackEvent.project_id)
                .single();

              if (projVideo?.film_video_id) {
                await supabase.from("project_entitlements").upsert({
                  project_id: chargebackEvent.project_id,
                  user_id: creatorId,
                  video_id: projVideo.film_video_id,
                  source_type: "dispute_reversal",
                }, { onConflict: "project_id,user_id" });
              }
            }
            // Record the reversal
            await supabase.from("project_financial_events").insert({
              project_id: chargebackEvent.project_id,
              event_type: "dispute_reversal",
              amount_cents: chargebackEvent.amount_cents,
              stripe_object_id: closedDispute.id,
              metadata_json: {
                dispute_id: closedDispute.id,
                status: closedDispute.status,
                creator_share_restored: creatorShare,
              },
            });
          }
        }

        console.log(`[webhook] dispute won, reversed: ${closedDispute.id}`);
      } else {
        console.log(`[webhook] dispute closed with status: ${closedDispute.status}, dispute: ${closedDispute.id}`);
      }
      break;
    }

    // ── Manual refund from Stripe dashboard ──
    case "charge.refunded": {
      const refundedCharge = event.data.object as Stripe.Charge;
      const refundPiId = typeof refundedCharge.payment_intent === "string"
        ? refundedCharge.payment_intent
        : refundedCharge.payment_intent?.id;

      if (!refundPiId) break;

      // Check if this is a preorder
      const { data: refundedPreorder } = await supabase
        .from("project_preorders")
        .select("id, project_id, user_id, amount_cents, current_status")
        .eq("stripe_payment_intent_id", refundPiId)
        .single();

      if (refundedPreorder && refundedPreorder.current_status !== "refunded" && refundedPreorder.current_status !== "disputed") {
        // Mark as refunded
        await supabase
          .from("project_preorders")
          .update({ current_status: "refunded", refunded_at: new Date().toISOString() })
          .eq("id", refundedPreorder.id);

        // Revoke entitlement
        await supabase
          .from("project_entitlements")
          .delete()
          .eq("project_id", refundedPreorder.project_id)
          .eq("user_id", refundedPreorder.user_id);

        // Record financial events (same rigor as dispute handler)
        const { data: refundProject } = await supabase
          .from("projects")
          .select("creator_id")
          .eq("id", refundedPreorder.project_id)
          .single();
        const refundFeeRate = refundProject
          ? await getCreatorFeeRate(refundProject.creator_id)
          : 0; // Safe default: 0% fee means under-debit (better than over-debit on founding creators)
        const creatorShare = Math.round(refundedPreorder.amount_cents * (1 - refundFeeRate));
        await supabase.from("project_financial_events").insert([
          {
            project_id: refundedPreorder.project_id,
            preorder_id: refundedPreorder.id,
            event_type: "preorder_refund",
            amount_cents: refundedPreorder.amount_cents,
            stripe_object_id: refundPiId,
          },
          {
            project_id: refundedPreorder.project_id,
            preorder_id: refundedPreorder.id,
            event_type: "creator_balance_reversal",
            amount_cents: creatorShare,
            metadata_json: { reason: "manual_stripe_refund", original_amount: refundedPreorder.amount_cents },
          },
        ]);

        // Reverse creator balance — atomic debit (available first, then held, with row lock)
        if (refundProject) {
          await supabase.rpc("atomic_dispute_debit", {
            p_profile_id: refundProject.creator_id,
            p_amount: creatorShare,
          });
        }

        console.log(`[webhook] manual refund processed for preorder ${refundedPreorder.id} with balance reversal`);
        break;
      }

      // Check if this is a purchase
      const { data: refundedPurchase } = await supabase
        .from("post_release_purchases")
        .select("id, project_id, user_id, amount_cents")
        .eq("payment_intent_id", refundPiId)
        .single();

      if (refundedPurchase) {
        // Remove purchase + revoke entitlement
        await supabase
          .from("post_release_purchases")
          .delete()
          .eq("id", refundedPurchase.id);

        await supabase
          .from("project_entitlements")
          .delete()
          .eq("project_id", refundedPurchase.project_id)
          .eq("user_id", refundedPurchase.user_id);

        // Record financial event + balance reversal for purchase refund
        if (refundedPurchase.amount_cents) {
          await supabase.from("project_financial_events").insert({
            project_id: refundedPurchase.project_id,
            event_type: "purchase_refund",
            amount_cents: refundedPurchase.amount_cents,
            stripe_object_id: refundPiId,
          });

          // Reverse creator balance — atomic debit
          const { data: purchaseProject } = await supabase
            .from("projects")
            .select("creator_id")
            .eq("id", refundedPurchase.project_id)
            .single();

          if (purchaseProject) {
            const refundFeeRate = await getCreatorFeeRate(purchaseProject.creator_id);
            const purchaseCreatorShare = Math.round(
              refundedPurchase.amount_cents * (1 - refundFeeRate)
            );
            await supabase.rpc("atomic_dispute_debit", {
              p_profile_id: purchaseProject.creator_id,
              p_amount: purchaseCreatorShare,
            });
          }
        }

        console.log(`[webhook] manual refund processed for purchase ${refundedPurchase.id} with balance reversal`);
      }
      break;
    }

    // Gracefully handle remaining active subscriptions (legacy)
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({
          is_active: false,
          canceled_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
  }

  return ok;
}
