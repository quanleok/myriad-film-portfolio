import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ensureVideosIndex,
  indexDocument,
  type VideoSearchDocument,
} from "@/lib/meilisearch/client";
import type { Tables } from "@/types/database";

type VideoWithProfile = Tables<"videos"> & {
  profiles: Pick<Tables<"profiles">, "display_name"> | null;
};

interface IndexVideoBody {
  id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("search-index", 10);
    if (rateLimited) return rateLimited;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as IndexVideoBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: "Video id is required" }, { status: 400 });
    }

    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select(
        `
      *,
      profiles!videos_creator_id_fkey (
        display_name
      )
    `
      )
      .eq("id", body.id)
      .single<VideoWithProfile>();

    if (videoError || !videoData) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const video = videoData;

    if (video.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!video.is_published) {
      return NextResponse.json(
        { error: "Only published videos can be indexed" },
        { status: 400 }
      );
    }

    const document: VideoSearchDocument = {
      id: video.id,
      title: video.title,
      description: video.description,
      creator_name: video.profiles?.display_name ?? "Unknown",
      creator_id: video.creator_id,
      genre: video.genre,
      tags: video.tags ?? [],
      content_type: video.content_type,
      media_type: video.media_type ?? "video",
      thumbnail_url: video.thumbnail_url,
      is_premium: video.is_premium ?? video.pricing_model !== "free",
      pricing_model: video.pricing_model,
      price_cents: video.price_cents,
      preview_duration_seconds: video.preview_duration_seconds,
      view_count: video.view_count,
      published_at: video.published_at,
    };

    await ensureVideosIndex();
    await indexDocument("videos", document);

    return NextResponse.json({ ok: true, document });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
