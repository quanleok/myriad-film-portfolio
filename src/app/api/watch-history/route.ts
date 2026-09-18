import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("watch_history")
      .select(
        `
      id,
      last_position_seconds,
      progress_seconds,
      duration_seconds,
      completed,
      updated_at,
      videos (
        id, title, thumbnail_url, duration_seconds,
        pricing_model, price_cents, view_count, avg_rating,
        genre, content_type, creator_id, is_published,
        profiles!videos_creator_id_fkey ( display_name, username, avatar_url, is_banned )
      )
    `
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("watch-history", 60);
    if (rateLimited) return rateLimited;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId, positionSeconds, durationSeconds } = await request.json();

    if (!videoId || positionSeconds === undefined) {
      return NextResponse.json(
        { error: "videoId and positionSeconds are required" },
        { status: 400 }
      );
    }

    const rawPos = Number(positionSeconds);
    const rawDur = Number(durationSeconds ?? 0);

    if (!Number.isFinite(rawPos) || !Number.isFinite(rawDur) || rawPos < 0 || rawDur < 0) {
      return NextResponse.json(
        { error: "Invalid position or duration values" },
        { status: 400 }
      );
    }

    const position = Math.floor(rawPos);
    const duration = rawDur ? Math.floor(rawDur) : 0;
    const completed = duration > 0 && position / duration > 0.9;

    // Atomic upsert — prevents race condition from check-then-insert pattern
    const { error } = await supabase.from("watch_history").upsert(
      {
        user_id: user.id,
        video_id: videoId,
        last_position_seconds: position,
        progress_seconds: position,
        duration_seconds: duration,
        completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,video_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
