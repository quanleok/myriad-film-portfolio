import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { getAdminUser } from "@/lib/admin";
import { fetchFilteredForumPosts } from "@/lib/forum-server";
import { parseForumCategory, parseForumSort, type ForumCategory } from "@/lib/forum";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const category = parseForumCategory(searchParams.get("category"));
  const sort = parseForumSort(searchParams.get("sort"));
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "20");

  const posts = await fetchFilteredForumPosts({
    query,
    category,
    sort,
    offset,
    limit,
  });

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/forum", "POST");
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

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!body.body_markdown?.trim()) {
      return NextResponse.json({ error: "Post body is required." }, { status: 400 });
    }

    const category = parseForumCategory(body.category);
    if (category === "all") {
      return NextResponse.json({ error: "Choose a forum category." }, { status: 400 });
    }

    if (category === "announcements") {
      const admin = await getAdminUser();
      if (!admin) {
        return NextResponse.json({ error: "Only admins can publish announcements." }, { status: 403 });
      }
    }

    const adminClient = createAdminClient();
    const { data: post, error } = await adminClient
      .from("forum_posts")
      .insert({
        user_id: user.id,
        title: body.title.trim(),
        body_markdown: body.body_markdown.trim(),
        category,
        tags: (body.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
        is_published: true,
      })
      .select("id")
      .single();

    if (error || !post) {
      console.error("[api] forum create error:", error);
      return NextResponse.json({ error: "Could not create post." }, { status: 500 });
    }

    return NextResponse.json({ id: post.id }, { status: 201 });
  } catch (error) {
    console.error("[api] forum POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

