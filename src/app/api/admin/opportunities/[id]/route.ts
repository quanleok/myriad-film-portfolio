import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOpportunityLifetimeDays } from "@/lib/opportunities";
import { getAdminOpportunityById } from "@/lib/opportunities-server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

function getExpiryISOString(days: number) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("admin-opportunities-action", 20);
    if (rateLimited) return rateLimited;

    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    if (!id.trim()) {
      return NextResponse.json({ error: "Missing listing id" }, { status: 400 });
    }

    let body: { action?: unknown; rejectionReason?: unknown };
    try {
      body = (await request.json()) as { action?: unknown; rejectionReason?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const action =
      body.action === "approve" || body.action === "reject" || body.action === "close"
        ? body.action
        : null;

    if (!action) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const existing = await getAdminOpportunityById(id);
    if (!existing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    if (action === "approve") {
      const lifetimeDays = getOpportunityLifetimeDays(existing.promotionTier);
      const expiresAt = getExpiryISOString(lifetimeDays);
      const { error: updateError } = await admin
        .from("opportunity_listings")
        .update({
          status: "live",
          published_at: now,
          expires_at: expiresAt,
          promotion_ends_at:
            existing.promotionTier === "featured" ? expiresAt : null,
          closed_at: null,
          rejection_reason: null,
        })
        .eq("id", id);

      if (updateError) {
        console.error("[api] admin opportunities approve error:", updateError);
        return NextResponse.json(
          { error: "Unable to approve listing" },
          { status: 500 }
        );
      }
    }

    if (action === "reject") {
      const rejectionReason =
        typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";

      const { error: updateError } = await admin
        .from("opportunity_listings")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || null,
        })
        .eq("id", id);

      if (updateError) {
        console.error("[api] admin opportunities reject error:", updateError);
        return NextResponse.json(
          { error: "Unable to reject listing" },
          { status: 500 }
        );
      }
    }

    if (action === "close") {
      const { error: updateError } = await admin
        .from("opportunity_listings")
        .update({
          status: "closed",
          closed_at: now,
        })
        .eq("id", id);

      if (updateError) {
        console.error("[api] admin opportunities close error:", updateError);
        return NextResponse.json(
          { error: "Unable to close listing" },
          { status: 500 }
        );
      }
    }

    const listing = await getAdminOpportunityById(id);
    if (!listing) {
      return NextResponse.json(
        { error: "Unable to load updated listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("[api] admin opportunities action route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
