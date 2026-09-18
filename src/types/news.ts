export type NewsSourcePlatform = "youtube" | "x" | "other";

export type NewsCategory =
  | "creator_spotlight"
  | "trend"
  | "tool_release"
  | "film_release"
  | "industry_news";

export interface NewsMediaItem {
  url: string;
  type: "image" | "video";
  caption?: string;
}

export interface NewsPostSummary {
  id: string;
  slug: string;
  title: string;
  body: string;
  cover_image_url: string | null;
  preview_video_url: string | null;
  source_platform: NewsSourcePlatform | null;
  source_url: string | null;
  source_creator_name: string | null;
  source_creator_handle: string | null;
  source_creator_url: string | null;
  source_title: string | null;
  source_preview_image_url: string | null;
  source_preview_quote: string | null;
  news_category: NewsCategory | null;
  tags: string[];
  published_at: string;
  is_pinned: boolean;
  like_count_cache: number;
  comment_count_cache: number;
}

export interface NewsPostDetail extends NewsPostSummary {
  media: NewsMediaItem[];
}

export interface NewsCommentWithProfile {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  replies?: NewsCommentWithProfile[];
}

export const NEWS_SOURCE_PLATFORMS: NewsSourcePlatform[] = [
  "youtube",
  "x",
  "other",
];

export const NEWS_CATEGORIES: NewsCategory[] = [
  "creator_spotlight",
  "trend",
  "tool_release",
  "film_release",
  "industry_news",
];

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  creator_spotlight: "New Drop",
  trend: "Trend",
  tool_release: "Tool Release",
  film_release: "Film Release",
  industry_news: "Industry News",
};

export const NEWS_COMMENT_MAX = 1000;
