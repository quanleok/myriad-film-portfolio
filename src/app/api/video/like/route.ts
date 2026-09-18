import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";


export async function POST(request: Request) {
  try {
    const limited = await checkRateLimit("video-like", 30, 60_000);
    if (limited) return limited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("video_id", videoId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ liked: true });
    }

    // Remove dislike FIRST to prevent race condition (mutually exclusive)
    const { error: deleteError } = await supabase
      .from("video_dislikes")
      .delete()
      .eq("user_id", user.id)
      .eq("video_id", videoId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from("likes")
      .insert({ user_id: user.id, video_id: videoId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ liked: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const limited = await checkRateLimit("video-like", 30, 60_000);
    if (limited) return limited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("video_id", videoId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ liked: false });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
