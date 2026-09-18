import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSignedUrl } from "@/lib/bunny/signed-url";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("video-access", 30);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    // Get the video (need creator_id + bunny_video_id + access fields)
    const { data: video } = await supabase
      .from("videos")
      .select("bunny_video_id, creator_id, pricing_model, is_published, deleted_at")
      .eq("id", videoId)
      .single();

    if (!video?.bunny_video_id) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // Creators always have access to their own content
    const isCreator = video.creator_id === user.id;
    if (isCreator) {
      const signedUrl = generateSignedUrl(video.bunny_video_id);
      return NextResponse.json({ url: signedUrl });
    }

    const isFree = video.pricing_model === "free";
    const isDeleted = !!video.deleted_at;

    // Soft-deleted videos: only direct purchasers retain stream access
    if (isDeleted) {
      const { data: purchaseRecord } = await supabase
        .from("purchases")
        .select("id")
        .eq("viewer_id", user.id)
        .eq("video_id", videoId)
        .eq("payment_status", "completed")
        .maybeSingle();

      if (!purchaseRecord) {
        return NextResponse.json(
          { error: "This video has been removed" },
          { status: 403 }
        );
      }
      const signedUrl = generateSignedUrl(video.bunny_video_id);
      return NextResponse.json({ url: signedUrl });
    }

    // Unpublished free videos: no access (drafts)
    if (!video.is_published && isFree) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // Published free videos: always accessible
    if (isFree) {
      const signedUrl = generateSignedUrl(video.bunny_video_id);
      return NextResponse.json({ url: signedUrl });
    }

    // Premium videos must be published (prevents access before premiere)
    if (!video.is_published) {
      return NextResponse.json(
        { error: "This content is not yet available" },
        { status: 403 }
      );
    }

    // Premium published videos: check purchase/subscription access
    const { data: hasAccess } = await supabase.rpc("viewer_has_access", {
      p_viewer_id: user.id,
      p_video_id: videoId,
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this video" },
        { status: 403 }
      );
    }

    const signedUrl = generateSignedUrl(video.bunny_video_id);
    return NextResponse.json({ url: signedUrl });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
