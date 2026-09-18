import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: video, error } = await supabase
      .from("videos")
      .select(
        `
      id,
      title,
      description,
      thumbnail_url,
      genre,
      content_type,
      content_rating,
      media_type,
      project_id,
      pricing_model,
      price_cents,
      is_premium,
      is_published,
      is_premiere,
      premiere_at,
      premiere_ended,
      preview_seconds,
      duration_seconds,
      view_count,
      like_count,
      dislike_count,
      comment_count,
      share_count,
      avg_rating,
      rating_count,
      purchase_count,
      tags,
      visibility,
      series_id,
      season_number,
      episode_number,
      creator_id,
      published_at,
      created_at,
      profiles!videos_creator_id_fkey (
        id,
        display_name,
        username,
        avatar_url
      )
    `
      )
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (error || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({ video });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
