import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { WITHDRAWAL_MINIMUM_CENTS } from "@/types/project";
import { getStripeOnboardingStatus } from "@/lib/stripe/connect";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("payout-withdraw", 5);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/payouts/withdraw", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Verify creator has Stripe payout setup + check available balance + frozen status
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, available_balance_cents, account_frozen")
      .eq("id", user.id)
      .single();

    if (profile?.account_frozen) {
      return NextResponse.json(
        { error: "Your account is frozen due to payment disputes. Contact support." },
        { status: 403 }
      );
    }

    let stripeReady = Boolean(profile?.stripe_onboarding_complete);
    if (profile?.stripe_account_id && !stripeReady) {
      try {
        stripeReady = await getStripeOnboardingStatus(profile.stripe_account_id);
        if (stripeReady !== Boolean(profile.stripe_onboarding_complete)) {
          await supabase
            .from("profiles")
            .update({ stripe_onboarding_complete: stripeReady })
            .eq("id", user.id);
        }
      } catch (error) {
        console.error("[payout-withdraw] failed to refresh Stripe onboarding:", error);
      }
    }

    if (!profile?.stripe_account_id || !stripeReady) {
      return NextResponse.json(
        { error: "Complete payout setup first" },
        { status: 400 }
      );
    }

    let body: { amount?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { amount } = body;

    if (!amount || typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount (in cents) is required" },
        { status: 400 }
      );
    }

    // Enforce $50 minimum withdrawal
    if (amount < WITHDRAWAL_MINIMUM_CENTS) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $50" },
        { status: 400 }
      );
    }

    // Atomic balance check + debit (prevents race condition with concurrent withdrawals)
    // atomic_withdraw returns void — raises 'insufficient_balance' exception on failure
    const adminSupabase = createAdminClient();
    const { error: withdrawError } = await adminSupabase.rpc("atomic_withdraw", {
      p_profile_id: user.id,
      p_amount: amount,
    });

    if (withdrawError) {
      if (withdrawError.message?.includes("insufficient_balance")) {
        return NextResponse.json(
          { error: "Insufficient available balance" },
          { status: 400 }
        );
      }
      console.error("[api] atomic_withdraw error:", withdrawError);
      return NextResponse.json(
        { error: "Withdrawal failed" },
        { status: 500 }
      );
    }

    // Check platform balance before attempting transfer
    const stripe = getStripe();
    const balance = await stripe.balance.retrieve();
    const availableUsd = balance.available.find((b) => b.currency === "usd");
    if (!availableUsd || availableUsd.amount < amount) {
      // Rollback the balance debit since we can't complete the transfer
      await adminSupabase.rpc("increment_available_balance", {
        p_profile_id: user.id,
        p_amount: amount,
      });
      return NextResponse.json(
        { error: "Insufficient platform balance. Please try again later." },
        { status: 503 }
      );
    }

    // Create Stripe transfer to creator's connected account
    let transfer;
    try {
      transfer = await stripe.transfers.create({
        amount,
        currency: "usd",
        destination: profile.stripe_account_id,
        metadata: {
          user_id: user.id,
        },
      });
    } catch (transferErr) {
      // Rollback the balance debit since Stripe transfer failed
      try {
        await adminSupabase.rpc("increment_available_balance", {
          p_profile_id: user.id,
          p_amount: amount,
        });
      } catch (rollbackErr) {
        // CRITICAL: Balance deducted but transfer failed AND rollback failed
        // Funds are stuck — needs manual intervention
        console.error("[api] CRITICAL: withdrawal rollback failed — funds stuck!", {
          user_id: user.id,
          amount_cents: amount,
          rollback_error: rollbackErr,
          transfer_error: transferErr,
        });
      }
      throw transferErr;
    }

    // Record financial event for audit trail
    const { error: eventError } = await adminSupabase
      .from("project_financial_events")
      .insert({
        event_type: "creator_withdrawal",
        amount_cents: -amount,
        stripe_object_id: transfer.id,
        metadata_json: {
          user_id: user.id,
          destination: profile.stripe_account_id,
        },
      });

    if (eventError) {
      console.error("[api] withdrawal financial event insert failed:", eventError);
    }

    console.log("[api] withdrawal successful:", {
      user_id: user.id,
      amount_cents: amount,
      transfer_id: transfer.id,
    });

    return NextResponse.json({
      success: true,
      transferId: transfer.id,
    });
  } catch (err) {
    console.error("[api] payout withdraw error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
