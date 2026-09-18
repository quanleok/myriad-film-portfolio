import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { getSeededForumPostById, type ForumCommentRecord } from "@/lib/forum";
import { fetchForumPostDetail } from "@/lib/forum-server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await fetchForumPostDetail(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ comments: post.comments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (getSeededForumPostById(id)) {
    return NextResponse.json({ error: "Sample threads are read-only." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logFailedAuth(`/api/forum/${id}/comments`, "POST");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const body = (await request.json()) as { body_markdown?: string; parent_id?: string | null };
  if (!body.body_markdown?.trim()) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (body.parent_id) {
    const { data: parent } = await admin
      .from("forum_comments")
      .select("id, parent_id, post_id")
      .eq("id", body.parent_id)
      .single();

    if (!parent || parent.post_id !== id) {
      return NextResponse.json({ error: "Reply target not found." }, { status: 404 });
    }

    if (parent.parent_id) {
      return NextResponse.json({ error: "Replies can only go one level deep." }, { status: 400 });
    }
  }

  const { error } = await admin.from("forum_comments").insert({
    post_id: id,
    user_id: user.id,
    parent_id: body.parent_id ?? null,
    body_markdown: body.body_markdown.trim(),
  });

  if (error) {
    console.error("[api] forum comment create error:", error);
    return NextResponse.json({ error: "Could not post comment." }, { status: 500 });
  }

  const { count } = await admin
    .from("forum_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", id);

  await admin.from("forum_posts").update({ comment_count: count ?? 0 }).eq("id", id);

  const detail = await fetchForumPostDetail(id);
  return NextResponse.json({ comments: (detail?.comments ?? []) as ForumCommentRecord[] });
}

