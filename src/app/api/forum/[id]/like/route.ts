import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { getSeededForumPostById } from "@/lib/forum";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (getSeededForumPostById(id)) {
    return NextResponse.json({ error: "Sample threads cannot be liked." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logFailedAuth(`/api/forum/${id}/like`, "POST");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("forum_post_likes")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("forum_post_likes").delete().eq("id", existing.id);
  } else {
    const { error } = await admin.from("forum_post_likes").insert({ post_id: id, user_id: user.id });
    if (error) {
      console.error("[api] forum post like error:", error);
      return NextResponse.json({ error: "Could not like post." }, { status: 500 });
    }
  }

  const { count } = await admin
    .from("forum_post_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", id);

  const nextCount = count ?? 0;
  await admin.from("forum_posts").update({ like_count: nextCount }).eq("id", id);

  return NextResponse.json({ liked: !existing?.id, like_count: nextCount });
}

