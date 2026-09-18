import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { getPosterOpportunityById } from "@/lib/opportunities-server";

interface RouteContext {
  params: Promise<{ opportunity: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("opportunity-close", 20);
    if (rateLimited) return rateLimited;

    const { opportunity } = await params;
    const listingId = opportunity.trim();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/opportunities/${listingId}/close`, "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const listing = await getPosterOpportunityById(user.id, listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.status !== "live") {
      return NextResponse.json(
        { error: "Only live listings can be closed" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("opportunity_listings")
      .update({
        status: "closed",
        closed_at: now,
      })
      .eq("id", listingId)
      .eq("poster_id", user.id);

    if (updateError) {
      console.error("[api] opportunity close error:", updateError);
      return NextResponse.json(
        { error: "Unable to close listing" },
        { status: 500 }
      );
    }

    const updated = await getPosterOpportunityById(user.id, listingId);
    if (!updated) {
      return NextResponse.json(
        { error: "Unable to load updated listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ listing: updated });
  } catch (error) {
    console.error("[api] opportunity close route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
