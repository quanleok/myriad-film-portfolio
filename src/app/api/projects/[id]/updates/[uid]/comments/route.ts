import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { stripHtmlTags } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string; uid: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id, uid } = await context.params;
    const adminSupabase = createAdminClient();

    // Fetch comments with user profiles
    const { data: comments, error } = await adminSupabase
      .from("project_update_comments")
      .select("id, update_id, user_id, body, created_at")
      .eq("update_id", uid)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[api] fetch comments error:", error);
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }

    // Fetch profiles for all commenters
    const userIds = [...new Set((comments ?? []).map((c: { user_id: string }) => c.user_id))];
    const profileMap: Record<string, { avatar_url: string | null; display_name: string | null; username: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from("profiles")
        .select("id, avatar_url, display_name, username")
        .in("id", userIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = { avatar_url: p.avatar_url, display_name: p.display_name, username: p.username };
        }
      }
    }

    // Get creator_id for the project
    const { data: project } = await adminSupabase
      .from("projects")
      .select("creator_id")
      .eq("id", id)
      .single();

    const enriched = (comments ?? []).map((c: { id: string; update_id: string; user_id: string; body: string; created_at: string }) => ({
      ...c,
      profile: profileMap[c.user_id] ?? null,
    }));

    return NextResponse.json({
      comments: enriched,
      creatorId: project?.creator_id ?? null,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("update-comment", 15);
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.body || typeof body.body !== "string") {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }

    const commentBody = stripHtmlTags(String(body.body).trim());
    if (commentBody.length === 0 || commentBody.length > 1000) {
      return NextResponse.json(
        { error: "Comment must be between 1 and 1000 characters" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Insert comment
    const { data: comment, error } = await adminSupabase
      .from("project_update_comments")
      .insert({ update_id: uid, user_id: user.id, body: commentBody })
      .select("id, update_id, user_id, body, created_at")
      .single();

    if (error) {
      console.error("[api] create comment error:", error);
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }

    // Increment comment_count_cache
    const { data: update } = await adminSupabase
      .from("project_updates")
      .select("comment_count_cache")
      .eq("id", uid)
      .single();

    await adminSupabase
      .from("project_updates")
      .update({ comment_count_cache: (update?.comment_count_cache ?? 0) + 1 })
      .eq("id", uid);

    // Fetch commenter profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      comment: { ...comment, profile: profile ?? null },
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
