import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/admin/creators/[id]/strike — Manually issue a strike
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("admin-strike", 10);
    if (rateLimited) return rateLimited;

    // Auth: require admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: creatorId } = await params;

    // Optional reason from body
    let reason = "Manual admin strike";
    try {
      const body = await request.json();
      if (body.reason && typeof body.reason === "string") {
        reason = body.reason;
      }
    } catch {
      // No body is fine — reason stays default
    }

    const admin = createAdminClient();

    // Verify creator exists
    const { data: creator, error: creatorError } = await admin
      .from("profiles")
      .select("id, display_name, strike_count, creator_good_standing")
      .eq("id", creatorId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Increment strike count via RPC
    await admin.rpc("increment_strike_count", { p_profile_id: creatorId });

    const newStrikeCount = (creator.strike_count ?? 0) + 1;

    // If 3+ strikes, revoke good standing
    if (newStrikeCount >= 3 && creator.creator_good_standing !== false) {
      await admin
        .from("profiles")
        .update({ creator_good_standing: false })
        .eq("id", creatorId);
    }

    // Notify the creator
    await admin.from("notifications").insert({
      user_id: creatorId,
      type: "admin_strike",
      title: "Strike issued",
      message: reason,
      link: "/dashboard",
    });

    return NextResponse.json({
      success: true,
      strikeCount: newStrikeCount,
      goodStanding: newStrikeCount < 3,
    });
  } catch (err) {
    console.error("[api] admin strike error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
