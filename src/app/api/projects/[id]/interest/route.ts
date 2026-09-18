import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("project-interest", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  // Check if already interested
  const { data: existing } = await supabase
    .from("project_interests")
    .select("id")
    .eq("project_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Remove interest
    await supabase
      .from("project_interests")
      .delete()
      .eq("project_id", id)
      .eq("user_id", user.id);
    return NextResponse.json({ interested: false });
  } else {
    // Add interest
    const { error } = await supabase
      .from("project_interests")
      .insert({ project_id: id, user_id: user.id });
    if (error) {
      console.error("Interest insert error:", error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    return NextResponse.json({ interested: true });
  }
}
