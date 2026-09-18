import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deleteDocument,
  ensureVideosIndex,
  indexDocument,
  type VideoSearchDocument,
} from "@/lib/meilisearch/client";
import { getPresignedUploadCredentials } from "@/lib/bunny/upload";
import type { Database, Tables } from "@/types/database";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { stripHtmlTags } from "@/lib/utils";
import { CONTENT_RATINGS } from "@/types/project";
import { normalizeVideoStoryElements } from "@/types/video";

type VideoUpdate = Database["public"]["Tables"]["videos"]["Update"];

type VideoWithProfile = Tables<"videos"> & {
  profiles: {
    display_name: string;
  } | null;
};

interface ManagePatchBody extends Partial<VideoUpdate> {
  videoId?: string;
  request_upload_url?: boolean;
}

interface ManageDeleteBody {
  videoId?: string;
}

function revalidateVideoSurfaces(videoId?: string) {
  revalidatePath("/");
  revalidatePath("/watch");
  if (videoId) {
    revalidatePath(`/watch/${videoId}`);
  }
}

const ALLOWED_UPDATE_FIELDS: (keyof VideoUpdate)[] = [
  "title",
  "description",
  "ai_tool",
  "story_elements",
  "content_type",
  "content_rating",
  "genre",
  "tags",
  "pricing_model",
  "price_cents",
  "is_premium",
  "preview_duration_seconds",
  "preview_type",
  "preview_seconds",
  "thumbnail_url",
  "project_id",
  "is_published",
  "series_id",
  "season_number",
  "episode_number",
  "is_premiere" as keyof VideoUpdate,
  "premiere_at" as keyof VideoUpdate,
  "premiere_ended" as keyof VideoUpdate,
  "visibility" as keyof VideoUpdate,
  "media_type" as keyof VideoUpdate,
];

function sanitizeStoryElements(input: unknown) {
  const normalized = normalizeVideoStoryElements(input);

  const sanitized = {
    characters: normalized.characters
      .map((card) => ({
        ...card,
        name: stripHtmlTags(card.name).slice(0, 80).trim(),
        description: stripHtmlTags(card.description).slice(0, 280).trim(),
      }))
      .filter((card) => card.name),
    locations: normalized.locations
      .map((card) => ({
        ...card,
        name: stripHtmlTags(card.name).slice(0, 80).trim(),
        description: stripHtmlTags(card.description).slice(0, 280).trim(),
      }))
      .filter((card) => card.name),
    props: normalized.props
      .map((card) => ({
        ...card,
        name: stripHtmlTags(card.name).slice(0, 80).trim(),
        description: stripHtmlTags(card.description).slice(0, 280).trim(),
      }))
      .filter((card) => card.name),
  };

  const hasAny = Object.values(sanitized).some((items) => items.length > 0);
  return hasAny ? sanitized : null;
}

function toSearchDocument(video: VideoWithProfile): VideoSearchDocument {
  return {
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
}

export async function PATCH(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("video-manage", 20);
    if (rateLimited) return rateLimited;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const body = (await request.json().catch(() => null)) as ManagePatchBody | null;
    if (!body?.videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const { data: existingData, error: existingError } = await supabase
      .from("videos")
      .select(
        `
      *,
      profiles!videos_creator_id_fkey (
        display_name
      )
    `
      )
      .eq("id", body.videoId)
      .is("deleted_at", null)
      .single<VideoWithProfile>();

    if (existingError || !existingData) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const existingVideo = existingData;
    if (existingVideo.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if ("title" in body && (typeof body.title !== "string" || body.title.length > 200)) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }
    if ("description" in body && body.description && (typeof body.description !== "string" || body.description.length > 5000)) {
      return NextResponse.json({ error: "Description must be 5000 characters or less" }, { status: 400 });
    }
    if ("ai_tool" in body && body.ai_tool && (typeof body.ai_tool !== "string" || body.ai_tool.length > 100)) {
      return NextResponse.json({ error: "AI model must be 100 characters or less" }, { status: 400 });
    }

    if (
      "content_rating" in body &&
      body.content_rating &&
      (typeof body.content_rating !== "string" ||
        !(CONTENT_RATINGS as readonly string[]).includes(body.content_rating))
    ) {
      return NextResponse.json(
        { error: "Content rating must be one of: general, teen, mature" },
        { status: 400 }
      );
    }

    // Sanitize user input — strip HTML tags
    if ("title" in body && typeof body.title === "string") {
      body.title = stripHtmlTags(body.title);
    }
    if ("description" in body && typeof body.description === "string") {
      body.description = stripHtmlTags(body.description);
    }
    if ("ai_tool" in body && typeof body.ai_tool === "string") {
      body.ai_tool = stripHtmlTags(body.ai_tool.trim()) || null;
    }
    if ("story_elements" in body) {
      body.story_elements = sanitizeStoryElements(body.story_elements);
    }

    const updateValues: VideoUpdate = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in body) {
        updateValues[field] = body[field] as never;
      }
    }

    if ("content_rating" in body) {
      updateValues.content_rating = body.content_rating
        ? String(body.content_rating)
        : null;
    }

    if ("project_id" in body) {
      const nextProjectId =
        typeof body.project_id === "string" && body.project_id.trim().length > 0
          ? body.project_id.trim()
          : null;

      if (nextProjectId) {
        const { data: linkedProject } = await supabase
          .from("projects")
          .select("id, creator_id")
          .eq("id", nextProjectId)
          .maybeSingle();

        if (!linkedProject) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (linkedProject.creator_id !== user.id) {
          return NextResponse.json(
            { error: "You do not own this project" },
            { status: 403 }
          );
        }
      }

      updateValues.project_id = nextProjectId;
    }

    if ("preview_duration_seconds" in updateValues) {
      updateValues.preview_seconds = updateValues.preview_duration_seconds ?? null;
    }

    if ("pricing_model" in updateValues && !("is_premium" in updateValues)) {
      updateValues.is_premium = updateValues.pricing_model !== "free";
    }

    if ("is_premium" in updateValues) {
      const nextPremium = Boolean(updateValues.is_premium);
      updateValues.is_premium = nextPremium;

      if (!nextPremium) {
        updateValues.pricing_model = "free";
        updateValues.price_cents = 0;
        updateValues.preview_duration_seconds = null;
        updateValues.preview_seconds = null;
        updateValues.preview_type = null;
      } else {
        const currentPricingModel =
          updateValues.pricing_model ?? existingVideo.pricing_model;
        updateValues.pricing_model =
          currentPricingModel === "subscription" ? "subscription" : "per_video";
      }
    }

    if (
      updateValues.is_premium &&
      updateValues.pricing_model !== "subscription" &&
      Number(updateValues.price_cents ?? existingVideo.price_cents ?? 0) <= 0
    ) {
      return NextResponse.json(
        { error: "Premium per-video content must have a positive price_cents value" },
        { status: 400 }
      );
    }

    if ("is_published" in updateValues) {
      const nextPublished = Boolean(updateValues.is_published);
      updateValues.is_published = nextPublished;
      updateValues.published_at = nextPublished
        ? existingVideo.published_at ?? new Date().toISOString()
        : null;
    }

    if (Object.keys(updateValues).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const { data: updatedData, error: updateError } = await supabase
      .from("videos")
      .update(updateValues)
      .eq("id", body.videoId)
      .select(
        `
      *,
      profiles!videos_creator_id_fkey (
        display_name
      )
    `
      )
      .single<VideoWithProfile>();

    if (updateError || !updatedData) {
      return NextResponse.json({ error: "Failed to update video" }, { status: 500 });
    }

    const updatedVideo = updatedData;

    if (updatedVideo.is_published) {
      try {
        await ensureVideosIndex();
        await indexDocument("videos", toSearchDocument(updatedVideo));
      } catch (error) {
        console.error("Failed to sync Meilisearch on update", error);
      }
    } else {
      try {
        await ensureVideosIndex();
        await deleteDocument("videos", updatedVideo.id);
      } catch (error) {
        console.error("Failed to remove Meilisearch document on unpublish", error);
      }
    }

    revalidateVideoSurfaces(updatedVideo.id);

    if (body.request_upload_url) {
      if (!updatedVideo.bunny_video_id) {
        return NextResponse.json(
          { error: "Video does not have a Bunny video id" },
          { status: 400 }
        );
      }

      const { uploadUrl, uploadHeaders } = getPresignedUploadCredentials(updatedVideo.bunny_video_id);
      return NextResponse.json({
        ok: true,
        video: updatedVideo,
        uploadUrl,
        uploadHeaders,
      });
    }

    return NextResponse.json({ ok: true, video: updatedVideo });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("video-delete", 10);
    if (rateLimited) return rateLimited;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const body = (await request.json().catch(() => null)) as ManageDeleteBody | null;
    if (!body?.videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("id, creator_id, bunny_video_id, purchase_count")
      .eq("id", body.videoId)
      .is("deleted_at", null)
      .single();

    if (videoError || !videoData) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    const isAdmin = profile?.is_admin === true;

    if (videoData.creator_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft-delete: set deleted_at + unpublish. Do NOT delete Bunny CDN file
    // so existing purchasers can still stream via direct URL.
    const { error: deleteError } = await supabase
      .from("videos")
      .update({
        deleted_at: new Date().toISOString(),
        is_published: false,
        published_at: null,
      })
      .eq("id", body.videoId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
    }

    // Remove from Meilisearch index
    try {
      await ensureVideosIndex();
      await deleteDocument("videos", body.videoId);
    } catch (error) {
      console.error("Failed to remove Meilisearch document on delete", error);
    }

    revalidateVideoSurfaces(body.videoId);

    return NextResponse.json({ ok: true, purchaseCount: videoData.purchase_count ?? 0 });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
