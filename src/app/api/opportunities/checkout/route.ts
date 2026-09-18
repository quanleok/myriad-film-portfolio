import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { getSiteUrl } from "@/lib/site-url";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import {
  getOpportunityEditableStatuses,
  getOpportunityListingFeeCents,
  getPosterOpportunityById,
} from "@/lib/opportunities-server";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("opportunity-checkout", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/opportunities/checkout", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email before posting" },
        { status: 403 }
      );
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    let body: { listingId?: unknown };
    try {
      body = (await request.json()) as { listingId?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const listingId =
      typeof body.listingId === "string" ? body.listingId.trim() : "";

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    const listing = await getPosterOpportunityById(user.id, listingId);

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const editableStatuses = getOpportunityEditableStatuses();
    if (!editableStatuses.has(listing.status)) {
      return NextResponse.json(
        { error: "This listing can no longer be submitted" },
        { status: 400 }
      );
    }

    if (listing.paidAt) {
      return NextResponse.json(
        { error: "This listing has already been paid for" },
        { status: 409 }
      );
    }

    if (listing.promotionTier !== "featured") {
      return NextResponse.json(
        { error: "Only featured listings require checkout." },
        { status: 400 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "A verified account email is required to continue" },
        { status: 400 }
      );
    }

    const siteUrl = getSiteUrl();
    const listingFeeCents = getOpportunityListingFeeCents();

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      success_url: `${siteUrl}/opportunities/post/success?listing=${encodeURIComponent(
        listing.id
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/opportunities/post?id=${encodeURIComponent(
        listing.id
      )}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: listingFeeCents,
            product_data: {
              name: "Opportunity listing fee",
              description: `${listing.title} — ${listing.companyName} (featured for 90 days)`,
            },
          },
        },
      ],
      metadata: {
        type: "opportunity_listing",
        listing_id: listing.id,
        poster_id: user.id,
      },
    });

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("opportunity_listings")
      .update({
        status: "payment_pending",
        stripe_checkout_session_id: session.id,
        stripe_payment_status: session.payment_status ?? "unpaid",
        listing_fee_cents: listingFeeCents,
      })
      .eq("id", listing.id)
      .eq("poster_id", user.id);

    if (updateError) {
      console.error("[api] opportunity checkout update error:", updateError);
      return NextResponse.json(
        { error: "Unable to start checkout" },
        { status: 500 }
      );
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[api] opportunity checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
