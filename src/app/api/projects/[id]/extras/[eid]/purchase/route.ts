import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe/client";
import { getCreatorFeeRate } from "@/lib/stripe/connect";

interface RouteContext {
  params: Promise<{ id: string; eid: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("extras-purchase", 15);
    if (rateLimited) return rateLimited;

    const { id, eid } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Fetch extra
    const { data: extra } = await adminSupabase
      .from("project_extras")
      .select("id, project_id, creator_id, title, access_level, price_cents, is_published")
      .eq("id", eid)
      .eq("project_id", id)
      .single();

    if (!extra || !extra.is_published) {
      return NextResponse.json({ error: "Extra not found" }, { status: 404 });
    }

    if (extra.access_level !== "paid") {
      return NextResponse.json({ error: "This extra is not a paid item" }, { status: 400 });
    }

    if (!extra.price_cents) {
      return NextResponse.json({ error: "Extra has no price set" }, { status: 400 });
    }

    // Check if already purchased
    const { data: existing } = await adminSupabase
      .from("project_extra_purchases")
      .select("id")
      .eq("extra_id", eid)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Already purchased" }, { status: 409 });
    }

    // Get creator's Stripe account for the transfer
    const { data: creatorProfile } = await adminSupabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", extra.creator_id)
      .single();

    const stripe = getStripe();
    const feeRate = await getCreatorFeeRate(extra.creator_id);
    const applicationFee = Math.round(extra.price_cents * feeRate);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: extra.price_cents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "extra_purchase",
        extra_id: eid,
        project_id: id,
        user_id: user.id,
      },
      ...(creatorProfile?.stripe_account_id
        ? {
            application_fee_amount: applicationFee,
            transfer_data: {
              destination: creatorProfile.stripe_account_id,
            },
          }
        : {}),
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      extraId: eid,
      amount: extra.price_cents,
    });
  } catch (err) {
    console.error("[api] extras purchase error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
