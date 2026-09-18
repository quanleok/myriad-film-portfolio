import type { ProjectLifecycleStatus, ProjectLaunchMode } from "@/types/project";

export interface ProjectCreatorSummary {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_founding_creator?: boolean | null;
  released_project_count?: number;
}

export interface ProjectCreatorFull extends ProjectCreatorSummary {
  bio: string | null;
  follower_count: number;
  delivery_record_summary: Record<string, unknown> | null;
  is_founding_creator: boolean | null;
  released_project_count: number;
}

export interface FeedCharacterCard {
  id: string;
  name: string;
  short_description: string | null;
  media_asset_id: string | null;
  media_type: "image" | "video" | null;
  sort_order: number;
}

export interface FeedConceptCard {
  id: string;
  caption: string | null;
  media_asset_id: string | null;
  media_type: "image" | "video" | null;
  sort_order: number;
}

export interface ProjectFeedItem {
  id: string;
  slug: string | null;
  title: string;
  hook: string | null;
  genre: string | null;
  format: string | null;
  tone: string | null;
  runtime_minutes: number | null;
  synopsis: string | null;
  inspiration_line: string | null;
  teaser_asset_id: string | null;
  teaser_thumbnail_url: string | null;
  external_teaser_url?: string | null;
  preorder_price_cents: number | null;
  release_price_cents: number | null;
  unlock_target: number | null;
  preorder_count_cache: number;
  like_count_cache: number;
  discussion_count_cache: number;
  interest_count_cache: number;
  lifecycle_status: ProjectLifecycleStatus;
  launch_mode: ProjectLaunchMode;
  content_rating: string | null;
  created_at: string;
  profiles: ProjectCreatorSummary | null;
  /** Extended creator profile, only present in feed API responses */
  creator: ProjectCreatorFull | null;
  /** Character cards, only present in feed API responses */
  character_cards: FeedCharacterCard[] | null;
  /** Concept cards, only present in feed API responses */
  concept_cards: FeedConceptCard[] | null;
  premiere_date: string | null;
  campaign_ends_at: string | null;
  delivery_deadline: string | null;
  production_window_days: number | null;
  is_overdue: boolean;
  purchase_count_cache: number;
  update_count_cache: number;
  save_count_cache: number;
  preorders_today: number;
  production_progress: number;
  episode_count: number | null;
  is_test: boolean;
}

export interface ProjectDetailPayload {
  project: {
    id: string;
    creator_id: string;
    slug: string | null;
    title: string;
    hook: string | null;
    synopsis: string | null;
    inspiration_line: string | null;
    genre: string | null;
    tone: string | null;
    format: string | null;
    runtime_minutes: number | null;
    teaser_asset_id: string | null;
    teaser_thumbnail_url: string | null;
    external_teaser_url?: string | null;
    preorder_price_cents: number | null;
    unlock_target: number | null;
    production_window_days: number | null;
    campaign_duration_days: number | null;
    campaign_starts_at: string | null;
    campaign_ends_at: string | null;
    unlocked_at: string | null;
    estimated_delivery_at: string | null;
    delivered_at: string | null;
    delivery_deadline: string | null;
    premiere_date: string | null;
    is_overdue: boolean;
    film_video_id: string | null;
    release_price_cents: number | null;
    content_rating: string | null;
    lifecycle_status: ProjectLifecycleStatus;
    launch_mode: ProjectLaunchMode;
    moderation_status: string;
    visibility: string;
    preorder_count_cache: number;
    like_count_cache: number;
    discussion_count_cache: number;
    interest_count_cache: number;
    save_count_cache: number;
    purchase_count_cache: number;
    update_count_cache: number;
    production_progress: number;
    episode_count: number | null;
    is_test: boolean;
    created_at: string;
    updated_at: string;
    profiles: {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      bio: string | null;
      is_founding_creator: boolean | null;
      released_project_count: number;
      delivery_record_summary: Record<string, unknown> | null;
      creator_good_standing: boolean;
    } | null;
  };
  characters: Array<{
    id: string;
    sort_order: number;
    name: string;
    short_description: string | null;
    media_asset_id: string | null;
    media_type: "image" | "video" | null;
  }>;
  concepts: Array<{
    id: string;
    sort_order: number;
    caption: string | null;
    media_asset_id: string | null;
    media_type: "image" | "video" | null;
  }>;
  hasPreordered: boolean;
  hasPurchased: boolean;
  userPreorderId: string | null;
  hasLiked: boolean;
  hasInterested: boolean;
  premiere: {
    premiere_scheduled_at: string | null;
    is_premiere_live: boolean;
    premiere_ended: boolean;
  } | null;
  episodes: Array<{
    id: string;
    episode_number: number;
    title: string;
    video_id: string | null;
    premiere_scheduled_at: string | null;
    premiere_ended: boolean;
    is_premiere_live: boolean;
  }> | null;
}

export interface ProjectUpdateItem {
  id: string;
  project_id: string;
  creator_id: string;
  update_type: "text" | "image" | "video" | "progress_proof";
  title: string | null;
  body: string | null;
  media_asset_id: string | null;
  is_progress_proof: boolean;
  review_status: "pending" | "approved" | "rejected" | null;
  created_at: string;
}

export interface ProjectDiscussionPost {
  id: string;
  project_id: string;
  user_id: string;
  parent_post_id: string | null;
  body: string;
  is_creator_reply: boolean;
  is_pinned: boolean;
  upvote_count_cache: number;
  created_at: string;
  user_avatar_url?: string | null;
  user_display_name?: string | null;
  user_username?: string | null;
}
