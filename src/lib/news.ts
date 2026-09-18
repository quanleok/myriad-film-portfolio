import { stripHtmlTags, slugify } from "@/lib/utils";
import type { NewsPostDetail, NewsPostSummary, NewsSourcePlatform } from "@/types/news";

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns: string) => any;
  };
};

interface RawNewsPost {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  media?: unknown;
  cover_image_url: string | null;
  source_platform: NewsSourcePlatform | null;
  source_url: string | null;
  source_creator_name: string | null;
  source_creator_handle: string | null;
  source_creator_url: string | null;
  source_title: string | null;
  source_preview_image_url: string | null;
  source_preview_quote: string | null;
  news_category: NewsPostSummary["news_category"];
  tags: string[] | null;
  published_at: string | null;
  is_pinned?: boolean | null;
  like_count_cache?: number | null;
  comment_count_cache?: number | null;
}

function getNewsMediaItems(media: unknown): NewsPostDetail["media"] {
  if (!Array.isArray(media)) return [];

  return media.filter((item): item is NewsPostDetail["media"][number] => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.url === "string" && (candidate.type === "image" || candidate.type === "video");
  });
}

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function parseYouTubeStartTime(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;

  let start: number | null = null;

  try {
    if (url) {
      const parsed = new URL(url);
      start =
        parseYouTubeStartTime(parsed.searchParams.get("t")) ??
        parseYouTubeStartTime(parsed.searchParams.get("start"));
    }
  } catch {
    start = null;
  }

  const params = new URLSearchParams({
    autoplay: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  if (start && start > 0) {
    params.set("start", String(start));
  }

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

export function normalizeSourceHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const trimmed = handle.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function getNewsPreviewImage(post: Pick<RawNewsPost, "source_preview_image_url" | "cover_image_url" | "source_platform" | "source_url">): string | null {
  if (post.source_preview_image_url) return post.source_preview_image_url;
  if (post.cover_image_url) return post.cover_image_url;
  if (post.source_platform === "youtube") return getYouTubeThumbnail(post.source_url);
  return null;
}

export function getNewsPreviewVideo(post: Pick<RawNewsPost, "media">): string | null {
  const firstVideo = getNewsMediaItems(post.media).find((item) => item.type === "video");
  return firstVideo?.url ?? null;
}

export function getNewsExcerpt(post: Pick<RawNewsPost, "body" | "source_preview_quote">, maxLength = 180): string {
  const candidate = post.source_preview_quote?.trim() || stripHtmlTags(post.body ?? "").replace(/\s+/g, " ").trim();
  if (!candidate) return "";
  if (candidate.length <= maxLength) return candidate;
  return `${candidate.slice(0, maxLength).trimEnd()}...`;
}

export function getSourcePlatformLabel(platform: NewsSourcePlatform | null | undefined): string {
  if (platform === "youtube") return "YouTube";
  if (platform === "x") return "X";
  return "Source";
}

export function getSourceLinkLabel(platform: NewsSourcePlatform | null | undefined): string {
  if (platform === "youtube") return "Watch on YouTube";
  if (platform === "x") return "View on X";
  return "Open source";
}

export function mapNewsSummary(post: RawNewsPost): NewsPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    body: post.body ?? "",
    cover_image_url: getNewsPreviewImage(post),
    preview_video_url: getNewsPreviewVideo(post),
    source_platform: post.source_platform ?? null,
    source_url: post.source_url ?? null,
    source_creator_name: post.source_creator_name ?? null,
    source_creator_handle: normalizeSourceHandle(post.source_creator_handle),
    source_creator_url: post.source_creator_url ?? null,
    source_title: post.source_title ?? null,
    source_preview_image_url: post.source_preview_image_url ?? null,
    source_preview_quote: post.source_preview_quote ?? null,
    news_category: post.news_category ?? null,
    tags: post.tags ?? [],
    published_at: post.published_at ?? new Date(0).toISOString(),
    is_pinned: post.is_pinned ?? false,
    like_count_cache: post.like_count_cache ?? 0,
    comment_count_cache: post.comment_count_cache ?? 0,
  };
}

export function mapNewsDetail(post: RawNewsPost & { media?: unknown }): NewsPostDetail {
  return {
    ...mapNewsSummary(post),
    media: getNewsMediaItems(post.media),
  };
}

export async function generateUniqueNewsSlug(
  admin: SupabaseLikeClient,
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title).slice(0, 72) || "news";
  let candidate = base;
  let suffix = 2;

  for (;;) {
    let query = admin
      .from("blog_posts")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
