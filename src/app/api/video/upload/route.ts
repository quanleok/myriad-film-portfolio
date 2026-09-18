import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBunnyVideo, getPresignedUploadCredentials } from "@/lib/bunny/upload";
import {
  ensureVideosIndex,
  indexDocument,
  type VideoSearchDocument,
} from "@/lib/meilisearch/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { stripHtmlTags } from "@/lib/utils";
import { CONTENT_RATINGS } from "@/types/project";
import { normalizeVideoStoryElements } from "@/types/video";

const VALID_CONTENT_TYPES = ["movie", "music_video", "series", "episode", "short"] as const;

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

export async function POST(request: NextRequest) {
  const rateLimited = await checkRateLimit("video-upload", 5);
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

  // Fetch profile; any logged-in user can upload, auto-promote to creator on first upload
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_creator, display_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  if (!profile.is_creator) {
    const { error: promoteError } = await supabase
      .from("profiles")
      .update({ is_creator: true })
      .eq("id", user.id);

    if (promoteError) {
      return NextResponse.json(
        { error: "Failed to activate creator account" },
        { status: 500 }
      );
    }
    profile.is_creator = true;
  }

  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", user.id);

  const body = await request.json();
  const {
    title,
    description,
    ai_tool,
    content_type,
    genre,
    pricing_model,
    price_cents,
    preview_type,
    preview_seconds,
    is_premium,
    preview_duration_seconds,
    tags,
    thumbnail_url,
    is_published,
    series_id,
    season_number,
    episode_number,
    is_premiere,
    premiere_at,
    premiere_ended,
    visibility,
    media_type,
    project_id,
    content_rating,
    story_elements,
    captchaToken,
  } = body;

  // Verify hCaptcha token
  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;
  if (hcaptchaSecret && captchaToken) {
    const verifyBody = new URLSearchParams({
      response: captchaToken,
      secret: hcaptchaSecret,
    });
    const captchaRes = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody.toString(),
    });
    const captchaData = await captchaRes.json();
    if (!captchaData.success) {
      console.error("hCaptcha verification failed:", JSON.stringify(captchaData));
      return NextResponse.json(
        { error: `Captcha verification failed: ${(captchaData["error-codes"] ?? []).join(", ")}` },
        { status: 400 }
      );
    }
  } else if (hcaptchaSecret && !captchaToken) {
    return NextResponse.json(
      { error: "Captcha verification required." },
      { status: 400 }
    );
  }

  if (!title || !content_type || !genre) {
    return NextResponse.json(
      { error: "Title, content type, and genre are required" },
      { status: 400 }
    );
  }

  if (!VALID_CONTENT_TYPES.includes(content_type)) {
    return NextResponse.json(
      { error: `Invalid content_type. Must be one of: ${VALID_CONTENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (typeof title !== "string" || title.length > 200) {
    return NextResponse.json(
      { error: "Title must be 200 characters or less" },
      { status: 400 }
    );
  }

  if (description && (typeof description !== "string" || description.length > 5000)) {
    return NextResponse.json(
      { error: "Description must be 5000 characters or less" },
      { status: 400 }
    );
  }

  if (ai_tool && (typeof ai_tool !== "string" || ai_tool.length > 100)) {
    return NextResponse.json(
      { error: "AI model must be 100 characters or less" },
      { status: 400 }
    );
  }

  if (
    content_rating &&
    (typeof content_rating !== "string" ||
      !(CONTENT_RATINGS as readonly string[]).includes(content_rating))
  ) {
    return NextResponse.json(
      { error: "Content rating must be one of: general, teen, mature" },
      { status: 400 }
    );
  }

  // Sanitize user input — strip HTML tags
  const sanitizedTitle = stripHtmlTags(title);
  const sanitizedDescription = description ? stripHtmlTags(description) : description;
  const sanitizedAiTool =
    typeof ai_tool === "string" && ai_tool.trim().length > 0
      ? stripHtmlTags(ai_tool.trim())
      : null;
  const sanitizedStoryElements = sanitizeStoryElements(story_elements);

  // Validate series ownership if series_id is provided
  if (series_id) {
    const { data: seriesData } = await supabase
      .from("series")
      .select("creator_id")
      .eq("id", series_id)
      .single();

    if (!seriesData) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }
    if (seriesData.creator_id !== user.id) {
      return NextResponse.json(
        { error: "You do not own this series" },
        { status: 403 }
      );
    }
  }

  if (project_id) {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, creator_id")
      .eq("id", project_id)
      .maybeSingle();

    if (!projectData) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (projectData.creator_id !== user.id) {
      return NextResponse.json(
        { error: "You do not own this project" },
        { status: 403 }
      );
    }
  }

  try {
    const normalizedPremium = Boolean(is_premium);
    const normalizedPricingModel = normalizedPremium
      ? pricing_model === "subscription"
        ? "subscription"
        : "per_video"
      : "free";
    const normalizedPriceForValidation = Number(price_cents ?? 0);
    const normalizedPriceCents = normalizedPremium
      ? normalizedPricingModel === "subscription"
        ? null
        : normalizedPriceForValidation
      : 0;
    const normalizedPreviewForValidation = Number(
      preview_duration_seconds ?? preview_seconds ?? 10
    );
    const normalizedPreviewDurationSeconds = normalizedPremium
      ? normalizedPreviewForValidation
      : null;

    if (
      normalizedPremium &&
      normalizedPricingModel !== "subscription" &&
      (!Number.isFinite(normalizedPriceForValidation) ||
        normalizedPriceForValidation <= 0)
    ) {
      return NextResponse.json(
        { error: "price_cents must be greater than 0 for premium per-video content" },
        { status: 400 }
      );
    }

    if (
      normalizedPremium &&
      (!Number.isFinite(normalizedPreviewForValidation) ||
        normalizedPreviewForValidation < 5 ||
        normalizedPreviewForValidation > 60)
    ) {
      return NextResponse.json(
        { error: "preview_duration_seconds must be between 5 and 60" },
        { status: 400 }
      );
    }

    // Create video on Bunny.net
    const bunnyVideo = await createBunnyVideo(sanitizedTitle);

    // Insert video record in Supabase
    const { data: video, error: dbError } = await supabase
      .from("videos")
      .insert({
        creator_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription || null,
        content_type,
        content_rating: content_rating || null,
        genre,
        ai_tool: sanitizedAiTool,
        project_id: project_id || null,
        pricing_model: normalizedPricingModel,
        is_premium: normalizedPremium,
        price_cents: normalizedPriceCents,
        preview_type: normalizedPremium ? preview_type || "first_minutes" : null,
        preview_seconds: normalizedPreviewDurationSeconds,
        preview_duration_seconds: normalizedPreviewDurationSeconds,
        tags: tags || [],
        story_elements: sanitizedStoryElements,
        thumbnail_url: thumbnail_url || `https://${process.env.BUNNY_CDN_HOSTNAME}/${bunnyVideo.guid}/thumbnail.jpg`,
        series_id: series_id || null,
        season_number: series_id ? (season_number ?? 1) : null,
        episode_number: series_id ? (episode_number ?? 1) : null,
        bunny_video_id: bunnyVideo.guid,
        bunny_library_id: process.env.BUNNY_STREAM_LIBRARY_ID,
        visibility: ["public", "unlisted", "private"].includes(visibility) ? visibility : "public",
        media_type: "video",
        is_published: Boolean(is_published),
        published_at: is_published ? new Date().toISOString() : null,
        is_premiere: Boolean(is_premiere),
        premiere_at: is_premiere ? premiere_at : null,
        premiere_ended: Boolean(premiere_ended),
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    // Get pre-signed upload credentials for browser-based TUS upload
    const { uploadUrl, uploadHeaders } = getPresignedUploadCredentials(bunnyVideo.guid);

    if (video.is_published) {
      const document: VideoSearchDocument = {
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

      try {
        await ensureVideosIndex();
        await indexDocument("videos", document);
      } catch (indexError) {
        console.error("Failed to index uploaded video", indexError);
      }
    }

    return NextResponse.json({
      videoId: video.id,
      bunnyVideoId: bunnyVideo.guid,
      uploadUrl,
      uploadHeaders,
    });
  } catch (err) {
    console.error("Upload API error:", err);
    const message = err instanceof Error ? err.message : "Upload initiation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
