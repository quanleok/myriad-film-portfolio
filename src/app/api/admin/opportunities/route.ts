import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isOpportunityStatus } from "@/lib/opportunities";
import { listAdminOpportunityListings } from "@/lib/opportunities-server";

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

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-opportunities", 30);
    if (rateLimited) return rateLimited;

    const { error } = await requireAdmin();
    if (error) return error;

    const status = request.nextUrl.searchParams.get("status") ?? "pending_review";
    const normalizedStatus =
      status === "all" || isOpportunityStatus(status) ? status : "pending_review";

    const listings = await listAdminOpportunityListings(normalizedStatus);
    return NextResponse.json({ listings });
  } catch (error) {
    console.error("[api] admin opportunities list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
