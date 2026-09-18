import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

// POST /api/creators/activate — set is_creator on profile (for viewers becoming creators)
export async function POST() {
  const rateLimited = await checkRateLimit("creator-activate", 10);
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  // Idempotent — return success if already a creator
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .single();

  if (profile?.is_creator) {
    return NextResponse.json({ success: true });
  }
  const { error } = await admin
    .from("profiles")
    .update({ is_creator: true, role: "creator" })
    .eq("id", user.id);

  if (error) {
    console.error("[api] creator activate error:", error);
    return NextResponse.json(
      { error: "Failed to activate creator account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
