import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";


export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("video-share", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();

    let body: { videoId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { videoId } = body;
    if (!videoId || typeof videoId !== "string")
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });

    // Use regular client (respects RLS) — only published videos visible
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id, creator_id, share_count")
      .eq("id", videoId)
      .eq("is_published", true)
      .single();

    if (videoError || !video)
      return NextResponse.json({ error: "Video not found" }, { status: 404 });

    // Increment share_count
    await supabase
      .from("videos")
      .update({ share_count: (video.share_count ?? 0) + 1 })
      .eq("id", videoId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
