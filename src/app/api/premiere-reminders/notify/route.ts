import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPremiereStarting } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("premiere-notify", 5);
    if (rateLimited) return rateLimited;

    // Auth check — only the video creator should trigger premiere notifications
    const userSupabase = await createClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Validate video exists and premiere has actually started
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id, title, creator_id, is_premiere, premiere_at")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Only the video creator can trigger premiere notifications
    if (video.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!video.is_premiere || !video.premiere_at) {
      return NextResponse.json({ error: "Not a premiere" }, { status: 400 });
    }

    if (new Date(video.premiere_at) > new Date()) {
      return NextResponse.json({ error: "Premiere has not started yet" }, { status: 400 });
    }

    await notifyPremiereStarting(videoId, video.title);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
