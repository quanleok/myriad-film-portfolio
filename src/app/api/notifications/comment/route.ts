import { createClient } from "@/lib/supabase/server";
import {
  notifyCreatorNewComment,
  notifyCommentReply,
} from "@/lib/notifications";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("notifications-comment", 20);
    if (rateLimited) return rateLimited;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId, parentId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    // Get commenter's display name
    const { data: commenterProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const commenterName = commenterProfile?.display_name ?? "Someone";

    // Get video info
    const { data: video } = await supabase
      .from("videos")
      .select("title, creator_id")
      .eq("id", videoId)
      .single();

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (parentId) {
      // Reply — notify the parent comment author
      const { data: parentComment } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", parentId)
        .single();

      if (parentComment && parentComment.user_id !== user.id) {
        await notifyCommentReply(
          parentComment.user_id,
          commenterName,
          video.title,
          videoId
        );
      }
    } else {
      // Top-level comment — notify the video creator
      if (video.creator_id !== user.id) {
        await notifyCreatorNewComment(
          video.creator_id,
          commenterName,
          video.title,
          videoId
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
