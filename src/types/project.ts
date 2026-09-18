// =============================================================================
// Project System Types — Myriad Spring Preorder Marketplace
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ProjectLifecycleStatus =
  | "draft"
  | "teaser"
  | "unlocking"
  | "in_production"
  | "premiering"
  | "released"
  | "failed_to_unlock"
  | "cancelled";

export type ProjectLaunchMode =
  | "teaser"
  | "preorder"
  | "production"
  | "direct_premiere"
  | "direct_release";

export type ProjectModerationStatus =
  | "private_draft"
  | "pending_review"
  | "live"
  | "flagged"
  | "suspended"
  | "rejected";

export type ProjectUpdateType = "text" | "image" | "video" | "progress_proof";

export type PayoutReleaseType = "unlock" | "progress_proof" | "delivery";

export type PayoutReleaseStatus = "pending" | "available" | "withdrawn" | "forfeited";

export type PreorderStatus = "active" | "committed" | "refunded" | "cancelled";

export type ProofReviewStatus = "pending" | "approved" | "rejected";

export type FinancialEventType =
  | "preorder_charge"
  | "preorder_refund"
  | "refund_balance_debit"
  | "payout_release_available"
  | "payout_withdrawn"
  | "late_preorder_charge"
  | "platform_fee"
  | "platform_fee_absorbed"
  | "dispute_chargeback"
  | "dispute_reversal"
  | "creator_withdrawal"
  | "post_release_sale"
  | "late_preorder_credit"
  | "post_release_sale"
  | "balance_credit"
  | "balance_withdrawal";

export type EntitlementSource = "preorder" | "purchase" | "admin_grant";

export type ReleaseOption = "backers_only" | "premium_purchase" | "free";

export type ProjectCollaboratorRole = "owner" | "editor" | "viewer";

export type ProjectCollaboratorInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked";

// ---------------------------------------------------------------------------
// Table Row Types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  creator_id: string;
  slug: string | null;
  title: string;
  hook: string | null;
  synopsis: string | null;
  genre: string | null;
  tone: string | null;
  content_rating: string | null;
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
  film_video_id: string | null;
  release_option: ReleaseOption | null;
  purchase_price_cents: number | null;
  lifecycle_status: ProjectLifecycleStatus;
  launch_mode: ProjectLaunchMode;
  moderation_status: ProjectModerationStatus;
  visibility: "public" | "private" | "unlisted";
  rights_attested_at: string | null;
  creator_terms_version: string | null;
  preorder_count_cache: number;
  like_count_cache: number;
  discussion_count_cache: number;
  interest_count_cache: number;
  inspiration_line: string | null;
  // Mechanics v2 fields
  release_price_cents: number | null;
  greenlit_at: string | null;
  greenlit_by: "auto" | "manual" | null;
  delivery_deadline: string | null;
  grace_period_end: string | null;
  manual_greenlight_eligible: boolean;
  preorders_closed_at: string | null;
  is_overdue: boolean;
  premiere_date: string | null;
  episode_count: number | null;
  source_short_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCharacterCard {
  id: string;
  project_id: string;
  sort_order: number;
  name: string;
  short_description: string | null;
  media_asset_id: string | null;
  media_type: "image" | "video";
  created_at: string;
}

export interface ProjectConceptCard {
  id: string;
  project_id: string;
  sort_order: number;
  caption: string | null;
  media_asset_id: string | null;
  media_type: "image" | "video";
  created_at: string;
}

export interface ProjectEpisode {
  id: string;
  project_id: string;
  episode_number: number;
  title: string;
  video_id: string | null;
  premiere_scheduled_at: string | null;
  premiere_ended: boolean;
  is_premiere_live: boolean;
  created_at: string;
}

export interface ProjectPreorder {
  id: string;
  project_id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  current_status: PreorderStatus;
  created_at: string;
  refunded_at: string | null;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  creator_id: string;
  update_type: ProjectUpdateType;
  title: string | null;
  body: string | null;
  media_asset_id: string | null;
  is_progress_proof: boolean;
  review_status: ProofReviewStatus | null;
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
  is_hidden: boolean;
  upvote_count_cache: number;
  created_at: string;
}

export interface ProjectPayoutRelease {
  id: string;
  project_id: string;
  release_type: PayoutReleaseType;
  amount_cents: number;
  status: PayoutReleaseStatus;
  available_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
}

export interface ProjectEntitlement {
  id: string;
  project_id: string;
  user_id: string;
  video_id: string | null;
  source_type: EntitlementSource;
  granted_at: string;
}

export interface ProjectStatusHistory {
  id: string;
  project_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface ProjectCollaborator {
  id: string;
  project_id: string;
  user_id: string;
  invited_by: string | null;
  role: ProjectCollaboratorRole;
  invite_status: ProjectCollaboratorInviteStatus;
  can_view_earnings: boolean;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFinancialEvent {
  id: string;
  project_id: string;
  preorder_id: string | null;
  payout_release_id: string | null;
  event_type: FinancialEventType;
  amount_cents: number;
  stripe_object_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface PostReleasePurchase {
  id: string;
  project_id: string;
  user_id: string;
  amount_cents: number;
  payment_intent_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Extended types (with joins)
// ---------------------------------------------------------------------------

export interface ProjectWithCreator extends Project {
  profiles: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    delivery_record_summary: Record<string, unknown> | null;
    creator_good_standing: boolean;
  };
}

export interface ProjectDetail extends ProjectWithCreator {
  character_cards: ProjectCharacterCard[];
  concept_cards: ProjectConceptCard[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROJECT_GENRES = [
  "sci_fi",
  "anime",
  "animation",
  "romance",
  "thriller",
  "comedy",
  "drama",
  "documentary",
  "fantasy",
  "action",
  "mystery",
  "parody",
] as const;

export const PROJECT_GENRE_LABELS: Record<string, string> = {
  sci_fi: "Sci-Fi",
  anime: "Anime",
  animation: "Animation",
  romance: "Romance",
  thriller: "Thriller",
  comedy: "Comedy",
  drama: "Drama",
  documentary: "Documentary",
  fantasy: "Fantasy",
  action: "Action",
  mystery: "Mystery",
  parody: "Parody",
};

export const PROJECT_TONES = [
  "dark",
  "lighthearted",
  "epic",
  "intimate",
  "surreal",
  "grounded",
  "humorous",
  "tense",
] as const;

export const PROJECT_FORMATS = [
  "short_film",
  "feature_film",
  // "series" — disabled until multi-episode entitlements are fixed
] as const;

export const PROJECT_FORMAT_LABELS: Record<string, string> = {
  short_film: "Short Film",
  feature_film: "Feature Film",
  series: "Series",
  // Legacy mappings for existing seed data
  film: "Film",
  animated: "Animated",
  series_pilot: "Series",
  mini_series: "Series",
  animated_short: "Animated",
};

export const CONTENT_RATINGS = ["general", "teen", "mature"] as const;

export const CONTENT_RATING_LABELS: Record<string, string> = {
  general: "G",
  teen: "PG-13",
  mature: "R",
};

export const PROJECT_TONE_LABELS: Record<string, string> = {
  dark: "Dark",
  lighthearted: "Lighthearted",
  epic: "Epic",
  intimate: "Intimate",
  surreal: "Surreal",
  grounded: "Grounded",
  humorous: "Humorous",
  tense: "Tense",
};

export const PROJECT_LAUNCH_MODES = [
  "teaser",
  "preorder",
  "production",
  "direct_premiere",
  "direct_release",
] as const;

export const LAUNCH_MODE_LABELS: Record<ProjectLaunchMode, string> = {
  teaser: "Teaser Project",
  preorder: "Seed Campaign",
  production: "Direct to Production",
  direct_premiere: "Premiere Film",
  direct_release: "Release Film",
};

// Legacy fixed arrays (kept for reference)
// export const CAMPAIGN_DURATIONS = [14, 21, 30] as const;
// export const PRODUCTION_WINDOWS = [30, 60, 90, 180] as const;

// Flexible range-based durations
export const CAMPAIGN_DURATION_MIN = 21; // days
export const CAMPAIGN_DURATION_MAX = 180; // 6 months
export const PRODUCTION_WINDOW_MIN = 21; // days
export const PRODUCTION_WINDOW_MAX = 180; // 6 months

// Fee calculation: proportional to duration, max $100, currently waived
export const CAMPAIGN_FEE_MAX_CENTS = 10000; // $100
export const PRODUCTION_FEE_MAX_CENTS = 10000; // $100
export const FEES_WAIVED = true; // Early access — all fees waived

/** Calculate fee in cents for a given duration. Proportional: 21 days = ~$12, 180 days = $100 */
export function calculateDurationFee(days: number, maxDays: number, maxFeeCents: number): number {
  return Math.round((days / maxDays) * maxFeeCents);
}

export const PREORDER_PRICE_MIN = 300; // $3.00
export const PREORDER_PRICE_MAX = 10000; // $100.00
export const RELEASE_PRICE_MIN = 300; // $3.00
export const RELEASE_PRICE_MAX = 20000; // $200.00
export const FULL_FILM_UPLOAD_MAX_MB = 20000; // 20 GB
export const UNLOCK_TARGET_MIN = 50;
export const UNLOCK_TARGET_MAX = 2000;
export const EPISODE_COUNT_MIN = 2;
export const EPISODE_COUNT_MAX = 50;
export const WITHDRAWAL_MINIMUM_CENTS = 5000; // $50.00

export const PLATFORM_FEE_PERCENT = 20;
export const PLATFORM_FEE_RATE = PLATFORM_FEE_PERCENT / 100; // 0.20

// Mechanics v2: new/proven creator payout split
export const PROVEN_CREATOR_AVAILABLE_PERCENT = 70;
export const PROVEN_CREATOR_HELD_PERCENT = 30;
export const MANUAL_GREENLIGHT_THRESHOLD = 0.5; // 50%
export const MANUAL_GREENLIGHT_WINDOW_HOURS = 48;
export const GRACE_PERIOD_DAYS = 14;

// CTA copy per lifecycle state
export const STATE_CTA_LABELS: Record<ProjectLifecycleStatus, string> = {
  draft: "Edit Draft",
  teaser: "Watch Teaser",
  unlocking: "Seed Project",
  in_production: "Preorder",
  premiering: "Watch Premiere",
  released: "Watch Now",
  failed_to_unlock: "Follow for Relaunch",
  cancelled: "View Details",
};
