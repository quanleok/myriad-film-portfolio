import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripHtmlTags } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // Strict rate limit: 2 reports per minute per IP
    const rateLimited = await checkRateLimit("report", 2);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, commentId, discussionPostId, reason, details } = body as {
      videoId?: string;
      commentId?: string;
      discussionPostId?: string;
      reason: string;
      details?: string;
    };

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    if (!videoId && !commentId && !discussionPostId) {
      return NextResponse.json({ error: "Must report a video, comment, or discussion post" }, { status: 400 });
    }

    const validReasons = ["copyright", "inappropriate", "spam", "harassment", "other"];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    const trimmedDetails = details ? stripHtmlTags(details.trim()) || null : null;
    if (trimmedDetails && trimmedDetails.length > 5000) {
      return NextResponse.json({ error: "Details must be 5000 characters or fewer" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("content_reports")
      .insert({
        reporter_id: user.id,
        video_id: videoId ?? null,
        comment_id: commentId ?? null,
        discussion_post_id: discussionPostId ?? null,
        reason,
        details: trimmedDetails,
      });

    if (insertError) {
      // Unique constraint violation = duplicate report
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already reported this content" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
