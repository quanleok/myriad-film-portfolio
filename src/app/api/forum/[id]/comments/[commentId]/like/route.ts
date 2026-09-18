import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logFailedAuth(`/api/forum/comments/${commentId}/like`, "POST");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("forum_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("forum_comment_likes").delete().eq("id", existing.id);
  } else {
    const { error } = await admin
      .from("forum_comment_likes")
      .insert({ comment_id: commentId, user_id: user.id });
    if (error) {
      console.error("[api] forum comment like error:", error);
      return NextResponse.json({ error: "Could not like comment." }, { status: 500 });
    }
  }

  const { count } = await admin
    .from("forum_comment_likes")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  const nextCount = count ?? 0;
  await admin.from("forum_comments").update({ like_count: nextCount }).eq("id", commentId);

  return NextResponse.json({ liked: !existing?.id, like_count: nextCount });
}

