import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deleteDocument,
  ensureVideosIndex,
  indexDocument,
  type VideoSearchDocument,
} from "@/lib/meilisearch/client";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/types/database";

type VideoAdminSearchRow = Pick<
  Database["public"]["Tables"]["videos"]["Row"],
  | "id"
  | "title"
  | "description"
  | "creator_id"
  | "genre"
  | "tags"
  | "content_type"
  | "media_type"
  | "thumbnail_url"
  | "is_premium"
  | "pricing_model"
  | "price_cents"
  | "preview_duration_seconds"
  | "view_count"
  | "published_at"
> & {
  profiles:
    | {
        display_name: string | null;
      }
    | {
        display_name: string | null;
      }[]
    | null;
};

function toSearchDocument(video: VideoAdminSearchRow): VideoSearchDocument {
  const profile = Array.isArray(video.profiles)
    ? (video.profiles[0] ?? null)
    : video.profiles;

  return {
    id: video.id,
    title: video.title,
    description: video.description,
    creator_name: profile?.display_name ?? "Unknown",
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
}

function revalidateVideoSurfaces() {
  revalidatePath("/");
  revalidatePath("/watch");
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null as any, user: null as any };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null as any, user: null as any };

  return { error: null, supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-videos", 30);
    if (rateLimited) return rateLimited;

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const sort = searchParams.get("sort") ?? "newest";
    const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);
    const limit = 25;

    const contentType = searchParams.get("content_type") ?? "";

    let query = supabase
      .from("videos")
      .select(`
      id, title, thumbnail_url, view_count, like_count, dislike_count,
      is_published, is_editors_pick, is_trending, created_at,
      content_type, media_type, creator_id,
      profiles!videos_creator_id_fkey (
        display_name, username, avatar_url
      )
    `);

    if (search) {
      const safeSearch = search.replace(/[%_\\(),."']/g, "");
      if (safeSearch) {
        query = query.ilike("title", `%${safeSearch}%`);
      }
    }

    if (contentType === "video") {
      query = query.in("content_type", ["movie", "series", "episode", "short"]).eq("media_type", "video");
    }

    switch (sort) {
      case "most_viewed":
        query = query.order("view_count", { ascending: false });
        break;
      case "most_disliked":
        query = query.order("dislike_count", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    query = query.range(cursor, cursor + limit - 1);

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Get report counts for these videos
    const videoIds = (data ?? []).map((v: any) => v.id);
    const { data: reportCounts } = await supabase
      .from("content_reports")
      .select("video_id")
      .in("video_id", videoIds.length > 0 ? videoIds : ["__none__"]);

    const reportCountMap: Record<string, number> = {};
    for (const r of reportCounts ?? []) {
      if (r.video_id) {
        reportCountMap[r.video_id] = (reportCountMap[r.video_id] ?? 0) + 1;
      }
    }

    const videos = (data ?? []).map((v: any) => ({
      ...v,
      report_count: reportCountMap[v.id] ?? 0,
      creator_name: v.profiles?.display_name ?? "Unknown",
      creator_username: v.profiles?.username ?? "",
      creator_avatar: v.profiles?.avatar_url ?? null,
    }));

    return NextResponse.json({
      videos,
      hasMore: (data ?? []).length === limit,
      nextCursor: (data ?? []).length === limit ? cursor + limit : null,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/videos — Perform actions on videos
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-videos-action", 10);
    if (rateLimited) return rateLimited;

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { action, videoIds } = body as {
      action: "feature" | "unfeature" | "remove" | "restore";
      videoIds: string[];
    };

    if (!action || !videoIds?.length) {
      return NextResponse.json({ error: "Missing action or videoIds" }, { status: 400 });
    }

    let updateData: Record<string, any> = {};

    switch (action) {
      case "feature":
        updateData = { is_editors_pick: true };
        break;
      case "unfeature":
        updateData = { is_editors_pick: false };
        break;
      case "remove":
        updateData = {
          is_published: false,
          published_at: null,
          deleted_at: new Date().toISOString(),
        };
        break;
      case "restore":
        updateData = {
          is_published: true,
          published_at: new Date().toISOString(),
          deleted_at: null,
        };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("videos")
      .update(updateData)
      .in("id", videoIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (action === "remove") {
      try {
        await ensureVideosIndex();
        await Promise.allSettled(videoIds.map((videoId) => deleteDocument("videos", videoId)));
      } catch (error) {
        console.error("Failed to remove admin-deleted videos from Meilisearch", error);
      }
    }

    if (action === "restore") {
      try {
        const { data: restoredVideos, error: restoredVideosError } = await supabase
          .from("videos")
          .select(
            `
            id,
            title,
            description,
            creator_id,
            genre,
            tags,
            content_type,
            media_type,
            thumbnail_url,
            is_premium,
            pricing_model,
            price_cents,
            preview_duration_seconds,
            view_count,
            published_at,
            profiles!videos_creator_id_fkey (
              display_name
            )
          `
          )
          .in("id", videoIds);

        if (restoredVideosError) {
          throw restoredVideosError;
        }

        await ensureVideosIndex();
        await Promise.allSettled(
          ((restoredVideos ?? []) as VideoAdminSearchRow[]).map((video) =>
            indexDocument("videos", toSearchDocument(video))
          )
        );
      } catch (error) {
        console.error("Failed to restore admin videos in Meilisearch", error);
      }
    }

    if (action === "remove" || action === "restore") {
      revalidateVideoSurfaces();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
