import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { stripHtmlTags } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string; did: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-discuss", 15);
    if (rateLimited) return rateLimited;

    const { id, did } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Verify project exists and is live
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, moderation_status")
      .eq("id", id)
      .single();

    if (!project || project.moderation_status !== "live") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify parent post exists and belongs to this project
    const { data: parent } = await supabase
      .from("project_discussion_posts")
      .select("id, project_id")
      .eq("id", did)
      .single();

    if (!parent || parent.project_id !== id) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let body: { body?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.body || typeof body.body !== "string") {
      return NextResponse.json(
        { error: "Reply body is required" },
        { status: 400 }
      );
    }

    const cleanBody = stripHtmlTags(String(body.body).trim());
    if (cleanBody.length < 1 || cleanBody.length > 2000) {
      return NextResponse.json(
        { error: "Reply must be between 1 and 2000 characters" },
        { status: 400 }
      );
    }

    const isCreatorReply = project.creator_id === user.id;

    const { data, error } = await supabase
      .from("project_discussion_posts")
      .insert({
        project_id: id,
        user_id: user.id,
        parent_post_id: did,
        body: cleanBody,
        is_creator_reply: isCreatorReply,
      })
      .select()
      .single();

    if (error) {
      console.error("[api] discussion reply error:", error);
      return NextResponse.json(
        { error: "Failed to post reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
