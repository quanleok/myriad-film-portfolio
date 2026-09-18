// =============================================================================
// Community System Types
// =============================================================================

export type CommunityPostIntent =
  | "showcase"
  | "feedback_wanted"
  | "interest_check"
  | "breakdown"
  | "project_update"
  | "work_in_progress";

export type CommunityChipType =
  | "story"
  | "consistency"
  | "audio"
  | "pacing"
  | "realism"
  | "would_watch";

export type CommunitySignalType =
  | "watch_this"
  | "notify_me"
  | "would_preorder";

export interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  bunny_video_id: string;
  thumbnail_url: string | null;
  genre: string | null;
  content_type: string | null;
  ai_model: string;
  intent: CommunityPostIntent | null;
  tool_tags: string[];
  workflow_notes: string | null;
  converted_project_id: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  feedback_chip_count: number;
  demand_signal_count: number;
  is_approved: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface CommunityPostWithProfile extends CommunityPost {
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_creator: boolean;
  };
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  timecode_seconds: number | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CommunityCommentWithProfile extends CommunityComment {
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  replies?: CommunityCommentWithProfile[];
}

export interface CommunityFeedbackChip {
  id: string;
  post_id: string;
  user_id: string;
  chip_type: CommunityChipType;
  created_at: string;
}

export interface CommunityDemandSignal {
  id: string;
  post_id: string;
  user_id: string;
  signal_type: CommunitySignalType;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Sorted by current popularity
export const AI_MODELS = [
  "Wan 2.1",
  "Seedance 2",
  "Kling 2.1",
  "Veo 3",
  "Sora",
  "Hailuo",
  "Runway Gen-4",
  "Pika 2.1",
  "Midjourney",
  "Vidu 2",
  "Luma Ray 2",
  "Stable Video",
  "Other",
] as const;

export type AiModel = (typeof AI_MODELS)[number];

/** Slug-safe key for URL query params */
export const AI_MODEL_SLUGS: Record<string, string> = {
  "Wan 2.1": "wan_2.1",
  "Seedance 2": "seedance_2",
  "Kling 2.1": "kling_2.1",
  "Veo 3": "veo_3",
  Sora: "sora",
  Hailuo: "hailuo",
  "Runway Gen-4": "runway_gen_4",
  "Pika 2.1": "pika_2.1",
  Midjourney: "midjourney",
  "Vidu 2": "vidu_2",
  "Luma Ray 2": "luma_ray_2",
  "Stable Video": "stable_video",
  Other: "other",
};

/** Reverse lookup: slug → display name */
export const AI_MODEL_FROM_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(AI_MODEL_SLUGS).map(([name, slug]) => [slug, name])
);

export const POST_INTENTS: { value: CommunityPostIntent; label: string; color: string }[] = [
  { value: "showcase", label: "Showcase", color: "gray" },
  { value: "feedback_wanted", label: "Feedback Wanted", color: "gray" },
  { value: "interest_check", label: "Interest Check", color: "gray" },
  { value: "breakdown", label: "Breakdown", color: "gray" },
  { value: "work_in_progress", label: "WIP", color: "gray" },
  { value: "project_update", label: "Project Update", color: "gray" },
];

export const INTENT_COLORS: Record<string, string> = {
  feedback_wanted: "bg-white/5 text-text-secondary border-white/10",
  interest_check: "bg-white/5 text-text-secondary border-white/10",
  breakdown: "bg-white/5 text-text-secondary border-white/10",
  project_update: "bg-white/5 text-text-secondary border-white/10",
};

export const FEEDBACK_CHIPS: { value: CommunityChipType; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "consistency", label: "Consistency" },
  { value: "audio", label: "Audio" },
  { value: "pacing", label: "Pacing" },
  { value: "realism", label: "Realism" },
  { value: "would_watch", label: "Would Watch" },
];

export const DEMAND_SIGNALS: { value: CommunitySignalType; label: string }[] = [
  { value: "watch_this", label: "I'd watch this" },
  { value: "notify_me", label: "Notify me" },
  { value: "would_preorder", label: "I'd preorder" },
];

export const CONTENT_TYPES = [
  "trailers",
  "cutscenes",
  "characters",
  "concepts",
  "short_films",
  "music_videos",
  "vfx",
  "other",
] as const;

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  trailers: "Trailers",
  cutscenes: "Cutscenes",
  characters: "Characters",
  concepts: "Concepts",
  short_films: "Short Films",
  music_videos: "Music Videos",
  vfx: "VFX",
  other: "Other",
};

// Validation
export const TITLE_MIN = 3;
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const COMMENT_MAX = 1000;
export const WORKFLOW_NOTES_MAX = 2000;
export const MAX_POSTS_PER_USER = 50;

// Legacy re-exports for backward compatibility during migration
export type ShowcasePost = CommunityPost;
export type ShowcasePostWithProfile = CommunityPostWithProfile;
export const SHOWCASE_TITLE_MIN = TITLE_MIN;
export const SHOWCASE_TITLE_MAX = TITLE_MAX;
export const SHOWCASE_DESCRIPTION_MAX = DESCRIPTION_MAX;
