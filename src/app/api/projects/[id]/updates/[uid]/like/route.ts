import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string; uid: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("update-like", 30);
    if (rateLimited) return rateLimited;

    const { uid } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const adminSupabase = createAdminClient();

    // Check if already liked
    const { data: existing } = await adminSupabase
      .from("project_update_likes")
      .select("id")
      .eq("update_id", uid)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Unlike
      await adminSupabase.from("project_update_likes").delete().eq("id", existing.id);

      const { data: update } = await adminSupabase
        .from("project_updates")
        .select("like_count_cache")
        .eq("id", uid)
        .single();

      const newCount = Math.max(0, (update?.like_count_cache ?? 1) - 1);
      await adminSupabase.from("project_updates").update({ like_count_cache: newCount }).eq("id", uid);

      return NextResponse.json({ liked: false, likeCount: newCount });
    } else {
      // Like
      await adminSupabase.from("project_update_likes").insert({ update_id: uid, user_id: user.id });

      const { data: update } = await adminSupabase
        .from("project_updates")
        .select("like_count_cache")
        .eq("id", uid)
        .single();

      const newCount = (update?.like_count_cache ?? 0) + 1;
      await adminSupabase.from("project_updates").update({ like_count_cache: newCount }).eq("id", uid);

      return NextResponse.json({ liked: true, likeCount: newCount });
    }
  } catch (err) {
    console.error("[api] update like error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
