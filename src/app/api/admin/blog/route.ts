import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateUniqueNewsSlug } from "@/lib/news";
import { NEWS_CATEGORIES, NEWS_SOURCE_PLATFORMS } from "@/types/news";

function hasAttachedVideo(media: unknown): boolean {
  return Array.isArray(media)
    ? media.some((item) => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Record<string, unknown>;
        return candidate.type === "video" && typeof candidate.url === "string" && candidate.url.trim().length > 0;
      })
    : false;
}

// GET /api/admin/blog — list all posts (admin only)
export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-blog-list", 30);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: posts, error } = await admin
      .from("blog_posts")
      .select("id, title, slug, is_published, is_pinned, published_at, created_at, updated_at, tags, news_category, source_platform, like_count_cache, comment_count_cache")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api] admin blog list error:", error);
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    return NextResponse.json({ posts: posts ?? [] });
  } catch (err) {
    console.error("[api] admin blog list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/blog — create post
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-blog-create", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const title = body.title as string;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const isPublished = body.is_published === true;
    const isPinned = body.is_pinned === true;
    const sourcePlatform =
      typeof body.source_platform === "string" &&
      NEWS_SOURCE_PLATFORMS.includes(body.source_platform as (typeof NEWS_SOURCE_PLATFORMS)[number])
        ? body.source_platform
        : null;
    const newsCategory =
      typeof body.news_category === "string" &&
      NEWS_CATEGORIES.includes(body.news_category as (typeof NEWS_CATEGORIES)[number])
        ? body.news_category
        : "trend";
    const sourceUrl =
      typeof body.source_url === "string" && body.source_url.trim().length > 0
        ? body.source_url.trim()
        : null;
    const sourceCreatorName =
      typeof body.source_creator_name === "string" && body.source_creator_name.trim().length > 0
        ? body.source_creator_name.trim()
        : null;
    const sourceCreatorHandle =
      typeof body.source_creator_handle === "string" && body.source_creator_handle.trim().length > 0
        ? body.source_creator_handle.trim()
        : null;
    const sourcePreviewImageUrl =
      typeof body.source_preview_image_url === "string" && body.source_preview_image_url.trim().length > 0
        ? body.source_preview_image_url.trim()
        : null;
    const hasVideoPreview = hasAttachedVideo(body.media);

    if (isPublished) {
      if (!sourcePlatform || !sourceUrl) {
        return NextResponse.json(
          { error: "Published news posts require a source platform and source URL" },
          { status: 400 }
        );
      }

      if (!sourceCreatorName && !sourceCreatorHandle) {
        return NextResponse.json(
          { error: "Published news posts require a credited creator name or handle" },
          { status: 400 }
        );
      }

      if (
        sourcePlatform === "x" &&
        !sourcePreviewImageUrl &&
        !(typeof body.cover_image_url === "string" && body.cover_image_url.trim()) &&
        !hasVideoPreview
      ) {
        return NextResponse.json(
          { error: "X posts need a preview image, cover image, or attached local video" },
          { status: 400 }
        );
      }
    }

    const slug = await generateUniqueNewsSlug(admin, title.trim());

    // If pinning, unpin all others first
    if (isPinned && isPublished) {
      await admin
        .from("blog_posts")
        .update({ is_pinned: false })
        .eq("is_pinned", true);
    }

    const { data: post, error } = await admin
      .from("blog_posts")
      .insert({
        author_id: user.id,
        slug,
        title: title.trim(),
        body: (body.body as string) ?? "",
        media: body.media ?? [],
        cover_image_url: (body.cover_image_url as string) ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        source_platform: sourcePlatform,
        source_url: sourceUrl,
        source_creator_name: sourceCreatorName,
        source_creator_handle: sourceCreatorHandle,
        source_creator_url:
          typeof body.source_creator_url === "string" && body.source_creator_url.trim().length > 0
            ? body.source_creator_url.trim()
            : null,
        source_title:
          typeof body.source_title === "string" && body.source_title.trim().length > 0
            ? body.source_title.trim()
            : null,
        source_preview_image_url: sourcePreviewImageUrl,
        source_preview_quote:
          typeof body.source_preview_quote === "string" && body.source_preview_quote.trim().length > 0
            ? body.source_preview_quote.trim()
            : null,
        news_category: newsCategory,
        is_pinned: isPinned,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[api] admin blog create error:", error);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (err) {
    console.error("[api] admin blog create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
