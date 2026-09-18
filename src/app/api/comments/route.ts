import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

import { stripHtmlTags } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("comment", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const videoId = typeof body?.videoId === "string" ? body.videoId : "";
    const parentId = typeof body?.parentId === "string" ? body.parentId : null;
    const text = typeof body?.body === "string" ? stripHtmlTags(body.body.trim()) : "";

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    if (!text || text.length > 2000) {
      return NextResponse.json(
        { error: "Comment must be 1-2000 characters" },
        { status: 400 }
      );
    }

    // Verify video exists
    const { data: video } = await supabase
      .from("videos")
      .select("id, creator_id")
      .eq("id", videoId)
      .single();

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // If reply, verify parent comment exists
    if (parentId) {
      const { data: parent } = await supabase
        .from("comments")
        .select("id")
        .eq("id", parentId)
        .eq("video_id", videoId)
        .single();

      if (!parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const { data: inserted, error } = await supabase
      .from("comments")
      .insert({
        user_id: user.id,
        video_id: videoId,
        parent_id: parentId,
        body: text,
      })
      .select("id, user_id, video_id, parent_id, body, created_at, like_count, is_pinned")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
    }

    return NextResponse.json({ comment: inserted }, { status: 201 });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
