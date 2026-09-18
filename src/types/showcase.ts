// =============================================================================
// Showcase Types — Community AI Video Gallery
// =============================================================================

export interface ShowcasePost {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  bunny_video_id: string;
  thumbnail_url: string | null;
  genre: string | null;
  content_type: string | null;
  ai_model: string;
  view_count: number;
  like_count: number;
  is_approved: boolean;
  created_at: string;
  deleted_at: string | null;
}

/** Post with joined profile info — used in feeds and cards */
export interface ShowcasePostWithProfile extends ShowcasePost {
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_creator: boolean;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AI_MODELS = [
  "Sora",
  "Kling 2.0",
  "Veo 3",
  "Seedance 2",
  "Wan 2.1",
  "Midjourney",
  "Runway Gen-3",
  "Pika 2.0",
  "Hailuo",
  "Vidu",
  "Luma Dream Machine",
  "Stable Video",
  "Other",
] as const;

export type AiModel = (typeof AI_MODELS)[number];

/** Slug-safe key for URL query params (lowercase, underscored) */
export const AI_MODEL_SLUGS: Record<string, string> = {
  "Sora": "sora",
  "Kling 2.0": "kling_2.0",
  "Veo 3": "veo_3",
  "Seedance 2": "seedance_2",
  "Wan 2.1": "wan_2.1",
  "Midjourney": "midjourney",
  "Runway Gen-3": "runway_gen_3",
  "Pika 2.0": "pika_2.0",
  "Hailuo": "hailuo",
  "Vidu": "vidu",
  "Luma Dream Machine": "luma_dream_machine",
  "Stable Video": "stable_video",
  "Other": "other",
};

/** Reverse lookup: slug → display name */
export const AI_MODEL_FROM_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(AI_MODEL_SLUGS).map(([name, slug]) => [slug, name])
);

// Validation limits
export const SHOWCASE_TITLE_MIN = 3;
export const SHOWCASE_TITLE_MAX = 100;
export const SHOWCASE_DESCRIPTION_MAX = 500;
