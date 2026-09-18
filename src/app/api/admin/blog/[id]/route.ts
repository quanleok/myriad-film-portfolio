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

// GET /api/admin/blog/[id] — get single post (admin only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;
    const admin = createAdminClient();
    const { data: post, error } = await admin
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (err) {
    console.error("[api] admin blog get error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/blog/[id] — update post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("admin-blog-update", 20);
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

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existingPost } = await admin
      .from("blog_posts")
      .select("id, title, media, cover_image_url, published_at, is_published, source_platform, source_url, source_creator_name, source_creator_handle, source_preview_image_url")
      .eq("id", id)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Build update payload — only include fields that were sent
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) {
      const nextTitle = (body.title as string).trim();
      if (!nextTitle) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      updates.title = nextTitle;
      updates.slug = await generateUniqueNewsSlug(admin, nextTitle, id);
    }
    if (body.body !== undefined) updates.body = body.body;
    if (body.media !== undefined) updates.media = body.media;
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.source_platform !== undefined) {
      updates.source_platform =
        typeof body.source_platform === "string" &&
        NEWS_SOURCE_PLATFORMS.includes(body.source_platform as (typeof NEWS_SOURCE_PLATFORMS)[number])
          ? body.source_platform
          : null;
    }
    if (body.source_url !== undefined) {
      updates.source_url =
        typeof body.source_url === "string" && body.source_url.trim().length > 0
          ? body.source_url.trim()
          : null;
    }
    if (body.source_creator_name !== undefined) {
      updates.source_creator_name =
        typeof body.source_creator_name === "string" && body.source_creator_name.trim().length > 0
          ? body.source_creator_name.trim()
          : null;
    }
    if (body.source_creator_handle !== undefined) {
      updates.source_creator_handle =
        typeof body.source_creator_handle === "string" && body.source_creator_handle.trim().length > 0
          ? body.source_creator_handle.trim()
          : null;
    }
    if (body.source_creator_url !== undefined) {
      updates.source_creator_url =
        typeof body.source_creator_url === "string" && body.source_creator_url.trim().length > 0
          ? body.source_creator_url.trim()
          : null;
    }
    if (body.source_title !== undefined) {
      updates.source_title =
        typeof body.source_title === "string" && body.source_title.trim().length > 0
          ? body.source_title.trim()
          : null;
    }
    if (body.source_preview_image_url !== undefined) {
      updates.source_preview_image_url =
        typeof body.source_preview_image_url === "string" && body.source_preview_image_url.trim().length > 0
          ? body.source_preview_image_url.trim()
          : null;
    }
    if (body.source_preview_quote !== undefined) {
      updates.source_preview_quote =
        typeof body.source_preview_quote === "string" && body.source_preview_quote.trim().length > 0
          ? body.source_preview_quote.trim()
          : null;
    }
    if (body.news_category !== undefined) {
      updates.news_category =
        typeof body.news_category === "string" &&
        NEWS_CATEGORIES.includes(body.news_category as (typeof NEWS_CATEGORIES)[number])
          ? body.news_category
          : null;
    }

    const nextSourcePlatform =
      (updates.source_platform as string | null | undefined) ??
      existingPost.source_platform ??
      null;
    const nextSourceUrl =
      (updates.source_url as string | null | undefined) ??
      existingPost.source_url ??
      null;
    const nextSourceCreatorName =
      (updates.source_creator_name as string | null | undefined) ??
      existingPost.source_creator_name ??
      null;
    const nextSourceCreatorHandle =
      (updates.source_creator_handle as string | null | undefined) ??
      existingPost.source_creator_handle ??
      null;
    const nextSourcePreviewImage =
      (updates.source_preview_image_url as string | null | undefined) ??
      existingPost.source_preview_image_url ??
      null;
    const nextMedia =
      updates.media !== undefined
        ? updates.media
        : existingPost.media;
    const nextCoverImage =
      (updates.cover_image_url as string | null | undefined) ??
      existingPost.cover_image_url ??
      null;

    // Handle publish state changes
    if (body.is_published !== undefined) {
      if (body.is_published === true) {
        if (!nextSourcePlatform || !nextSourceUrl) {
          return NextResponse.json(
            { error: "Published news posts require a source platform and source URL" },
            { status: 400 }
          );
        }

        if (!nextSourceCreatorName && !nextSourceCreatorHandle) {
          return NextResponse.json(
            { error: "Published news posts require a credited creator name or handle" },
            { status: 400 }
          );
        }

        if (
          nextSourcePlatform === "x" &&
          !nextSourcePreviewImage &&
          !nextCoverImage &&
          !hasAttachedVideo(nextMedia)
        ) {
          return NextResponse.json(
            { error: "X posts need a preview image, cover image, or attached local video" },
            { status: 400 }
          );
        }
      }

      updates.is_published = body.is_published;
      if (body.is_published === true) {
        // Set published_at only on first publish
        if (!existingPost.published_at) {
          updates.published_at = new Date().toISOString();
        }
      }
    }

    // Handle pin
    if (body.is_pinned !== undefined) {
      updates.is_pinned = body.is_pinned;
      const willBePublished =
        body.is_published === undefined
          ? Boolean(existingPost.is_published)
          : body.is_published === true;
      if (body.is_pinned === true && willBePublished) {
        // Unpin all others
        await admin
          .from("blog_posts")
          .update({ is_pinned: false })
          .eq("is_pinned", true)
          .neq("id", id);
      }
    }

    const { data: post, error } = await admin
      .from("blog_posts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[api] admin blog update error:", error);
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (err) {
    console.error("[api] admin blog update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/blog/[id] — delete post
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("admin-blog-delete", 10);
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

    const { id } = await params;
    const admin = createAdminClient();

    const { error } = await admin
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[api] admin blog delete error:", error);
      return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] admin blog delete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
