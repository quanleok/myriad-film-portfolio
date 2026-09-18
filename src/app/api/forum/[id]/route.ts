import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { fetchForumPostDetail } from "@/lib/forum-server";
import { parseForumCategory, type ForumCategory } from "@/lib/forum";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await fetchForumPostDetail(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/forum/${id}`, "PATCH");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const body = (await request.json()) as {
      title?: string;
      body_markdown?: string;
      category?: ForumCategory;
      tags?: string[];
    };

    const category = body.category ? parseForumCategory(body.category) : undefined;
    if (category === "all") {
      return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("forum_posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title?.trim()) updateData.title = body.title.trim();
    if (body.body_markdown?.trim()) updateData.body_markdown = body.body_markdown.trim();
    if (category) updateData.category = category;
    if (Array.isArray(body.tags)) updateData.tags = body.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);

    const { error } = await admin.from("forum_posts").update(updateData).eq("id", id);
    if (error) {
      console.error("[api] forum update error:", error);
      return NextResponse.json({ error: "Could not update post." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] forum PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/forum/${id}`, "DELETE");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("forum_posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin.from("forum_posts").delete().eq("id", id);
    if (error) {
      console.error("[api] forum delete error:", error);
      return NextResponse.json({ error: "Could not delete post." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] forum DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

