import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { stripHtmlTags } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const adminSupabase = createAdminClient();

    // Verify project is live before exposing discussion
    const { data: project } = await adminSupabase
      .from("projects")
      .select("moderation_status")
      .eq("id", id)
      .single();

    if (!project || project.moderation_status !== "live") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse sort query param
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "newest";

    let query = adminSupabase
      .from("project_discussion_posts")
      .select(
        "id, project_id, user_id, parent_post_id, body, is_creator_reply, is_pinned, upvote_count_cache, created_at"
      )
      .eq("project_id", id);

    if (sort === "top") {
      query = query.order("upvote_count_cache", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("[api] fetch discussion posts error:", error);
      return NextResponse.json(
        { error: "Failed to fetch discussion posts" },
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    // Fetch user profiles for all post authors
    const userIds = [...new Set(posts.map((p) => p.user_id))];
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    const enrichedPosts = posts.map((post) => {
      const profile = profileMap.get(post.user_id);
      return {
        ...post,
        user_avatar_url: profile?.avatar_url ?? null,
        user_display_name: profile?.display_name ?? null,
        user_username: profile?.username ?? null,
      };
    });

    return NextResponse.json({ posts: enrichedPosts });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-discuss", 15);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Verify the project is live
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, moderation_status")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.moderation_status !== "live") {
      return NextResponse.json(
        { error: "Discussion is only available for live projects" },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Validate body text
    if (!body.body || typeof body.body !== "string") {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    const postBody = stripHtmlTags(String(body.body).trim());
    if (postBody.length === 0) {
      return NextResponse.json(
        { error: "body cannot be empty" },
        { status: 400 }
      );
    }
    if (postBody.length > 2000) {
      return NextResponse.json(
        { error: "body must be 2000 characters or less" },
        { status: 400 }
      );
    }

    // Validate parent_post_id if provided
    let parentPostId: string | null = null;
    if (body.parent_post_id && typeof body.parent_post_id === "string") {
      const { data: parentPost } = await supabase
        .from("project_discussion_posts")
        .select("id, project_id")
        .eq("id", body.parent_post_id)
        .single();

      if (!parentPost) {
        return NextResponse.json(
          { error: "Parent post not found" },
          { status: 404 }
        );
      }

      if (parentPost.project_id !== id) {
        return NextResponse.json(
          { error: "Parent post belongs to a different project" },
          { status: 400 }
        );
      }

      parentPostId = body.parent_post_id as string;
    }

    // Auto-detect if user is the project creator
    const isCreatorReply = user.id === project.creator_id;

    const { data, error } = await supabase
      .from("project_discussion_posts")
      .insert({
        project_id: id,
        user_id: user.id,
        parent_post_id: parentPostId,
        body: postBody,
        is_creator_reply: isCreatorReply,
      })
      .select()
      .single();

    if (error) {
      console.error("[api] create discussion post error:", error);
      return NextResponse.json(
        { error: "Failed to create discussion post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post: data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
