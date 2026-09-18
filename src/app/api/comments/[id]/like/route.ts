import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimited = await checkRateLimit("comment-like", 30);
    if (rateLimited) return rateLimited;

    const { id: commentId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isLike } = await request.json();
    const isLikeBool = isLike !== false;

    // Check existing
    const { data: existing } = await supabase
      .from("comment_likes")
      .select("id, is_like")
      .eq("user_id", user.id)
      .eq("comment_id", commentId)
      .maybeSingle();

    if (existing) {
      if (existing.is_like === isLikeBool) {
        // Same action — remove it (toggle off)
        await supabase.from("comment_likes").delete().eq("id", existing.id);

        // Update like_count
        if (isLikeBool) {
          await supabase.rpc("decrement_comment_likes", { p_comment_id: commentId });
        }

        return NextResponse.json({ action: "removed" });
      }

      // Switch from like to dislike or vice versa
      await supabase
        .from("comment_likes")
        .update({ is_like: isLikeBool })
        .eq("id", existing.id);

      if (isLikeBool) {
        // Was dislike, now like — increment
        await supabase.rpc("increment_comment_likes", { p_comment_id: commentId });
      } else {
        // Was like, now dislike — decrement
        await supabase.rpc("decrement_comment_likes", { p_comment_id: commentId });
      }

      return NextResponse.json({ action: "switched" });
    }

    // Insert new
    const { error } = await supabase.from("comment_likes").insert({
      user_id: user.id,
      comment_id: commentId,
      is_like: isLikeBool,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (isLikeBool) {
      await supabase.rpc("increment_comment_likes", { p_comment_id: commentId });
    }

    return NextResponse.json({ action: "added" });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
