import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string; did: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-upvote", 30);
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

    // Verify the post exists and belongs to this project
    const { data: post } = await supabase
      .from("project_discussion_posts")
      .select("id, project_id")
      .eq("id", did)
      .eq("project_id", id)
      .single();

    if (!post) {
      return NextResponse.json(
        { error: "Discussion post not found" },
        { status: 404 }
      );
    }

    // Check if user already upvoted
    const { data: existingUpvote } = await supabase
      .from("project_discussion_upvotes")
      .select("id")
      .eq("post_id", did)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingUpvote) {
      // Remove upvote
      const { error: deleteError } = await supabase
        .from("project_discussion_upvotes")
        .delete()
        .eq("post_id", did)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("[api] remove upvote error:", deleteError);
        return NextResponse.json(
          { error: "Failed to remove upvote" },
          { status: 500 }
        );
      }

      return NextResponse.json({ upvoted: false });
    } else {
      // Add upvote
      const { error: insertError } = await supabase
        .from("project_discussion_upvotes")
        .insert({
          post_id: did,
          user_id: user.id,
        });

      if (insertError) {
        console.error("[api] add upvote error:", insertError);
        return NextResponse.json(
          { error: "Failed to add upvote" },
          { status: 500 }
        );
      }

      return NextResponse.json({ upvoted: true });
    }
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
