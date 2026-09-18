import {
  CAMPAIGN_DURATION_MAX,
  CAMPAIGN_DURATION_MIN,
  EPISODE_COUNT_MAX,
  EPISODE_COUNT_MIN,
  PREORDER_PRICE_MAX,
  PREORDER_PRICE_MIN,
  PRODUCTION_WINDOW_MAX,
  PRODUCTION_WINDOW_MIN,
  RELEASE_PRICE_MAX,
  RELEASE_PRICE_MIN,
  UNLOCK_TARGET_MAX,
  UNLOCK_TARGET_MIN,
  type ProjectLaunchMode,
} from "@/types/project";

export type LaunchRequirementKey =
  | "title"
  | "hook"
  | "genre"
  | "content_rating"
  | "teaser_asset_id"
  | "synopsis"
  | "preorder_price_cents"
  | "unlock_target"
  | "campaign_duration_days"
  | "production_window_days"
  | "release_price_cents"
  | "episode_count"
  | "film_video_id"
  | "rights_attested"
  | "creator_terms_version";

export interface LaunchReadinessInput {
  launchMode: ProjectLaunchMode;
  title?: string | null;
  hook?: string | null;
  genre?: string | null;
  contentRating?: string | null;
  teaserAssetId?: string | null;
  synopsis?: string | null;
  preorderPriceCents?: number | null;
  unlockTarget?: number | null;
  campaignDurationDays?: number | null;
  productionWindowDays?: number | null;
  releasePriceCents?: number | null;
  episodeCount?: number | null;
  format?: string | null;
  filmVideoId?: string | null;
  rightsReady?: boolean;
  termsReady?: boolean;
}

const REQUIREMENT_LABELS: Record<LaunchRequirementKey, string> = {
  title: "title",
  hook: "hook",
  genre: "genre",
  content_rating: "content rating",
  teaser_asset_id: "teaser video",
  synopsis: "synopsis",
  preorder_price_cents: "preorder price",
  unlock_target: "unlock target",
  campaign_duration_days: "campaign length",
  production_window_days: "production window",
  release_price_cents: "release price",
  episode_count: "episode count",
  film_video_id: "film upload",
  rights_attested: "rights confirmation",
  creator_terms_version: "creator terms",
};

function hasText(value: string | null | undefined, minLength = 1): boolean {
  return value != null && value.trim().length >= minLength;
}

function isFiniteInRange(
  value: number | null | undefined,
  min: number,
  max: number
): boolean {
  return Number.isFinite(value) && value != null && value >= min && value <= max;
}

export function getLaunchRequirementLabel(field: LaunchRequirementKey): string {
  return REQUIREMENT_LABELS[field];
}

export function getLaunchRequirementKeys(
  input: LaunchReadinessInput,
  options?: { includeCompliance?: boolean }
): LaunchRequirementKey[] {
  const keys: LaunchRequirementKey[] = ["title", "hook", "genre", "content_rating"];

  switch (input.launchMode) {
    case "teaser":
      keys.push("teaser_asset_id");
      break;
    case "preorder":
      keys.push(
        "teaser_asset_id",
        "synopsis",
        "preorder_price_cents",
        "unlock_target",
        "campaign_duration_days",
        "production_window_days",
        "release_price_cents"
      );
      break;
    case "production":
      keys.push(
        "teaser_asset_id",
        "synopsis",
        "preorder_price_cents",
        "production_window_days",
        "release_price_cents"
      );
      break;
    case "direct_premiere":
    case "direct_release":
      keys.push("film_video_id");
      break;
  }

  if (input.format === "series" && (input.launchMode === "preorder" || input.launchMode === "production")) {
    keys.push("episode_count");
  }

  if (options?.includeCompliance) {
    keys.push("rights_attested", "creator_terms_version");
  }

  return keys;
}

export function isLaunchRequirementReady(
  field: LaunchRequirementKey,
  input: LaunchReadinessInput
): boolean {
  switch (field) {
    case "title":
      return hasText(input.title, 3);
    case "hook":
      return hasText(input.hook, 10);
    case "genre":
      return hasText(input.genre);
    case "content_rating":
      return hasText(input.contentRating);
    case "teaser_asset_id":
      return hasText(input.teaserAssetId);
    case "synopsis":
      return hasText(input.synopsis, 50);
    case "preorder_price_cents":
      return isFiniteInRange(
        input.preorderPriceCents,
        PREORDER_PRICE_MIN,
        PREORDER_PRICE_MAX
      );
    case "unlock_target":
      return isFiniteInRange(input.unlockTarget, UNLOCK_TARGET_MIN, UNLOCK_TARGET_MAX);
    case "campaign_duration_days":
      return isFiniteInRange(
        input.campaignDurationDays,
        CAMPAIGN_DURATION_MIN,
        CAMPAIGN_DURATION_MAX
      );
    case "production_window_days":
      return isFiniteInRange(
        input.productionWindowDays,
        PRODUCTION_WINDOW_MIN,
        PRODUCTION_WINDOW_MAX
      );
    case "release_price_cents":
      return (
        isFiniteInRange(
          input.releasePriceCents,
          RELEASE_PRICE_MIN,
          RELEASE_PRICE_MAX
        ) &&
        (input.preorderPriceCents == null ||
          (input.releasePriceCents ?? 0) >= input.preorderPriceCents)
      );
    case "episode_count":
      return isFiniteInRange(input.episodeCount, EPISODE_COUNT_MIN, EPISODE_COUNT_MAX);
    case "film_video_id":
      return hasText(input.filmVideoId);
    case "rights_attested":
      return Boolean(input.rightsReady);
    case "creator_terms_version":
      return Boolean(input.termsReady);
  }
}

export function getLaunchReadiness(
  input: LaunchReadinessInput,
  options?: { includeCompliance?: boolean }
): {
  checklist: Array<{ key: LaunchRequirementKey; label: string; ready: boolean }>;
  missingFields: LaunchRequirementKey[];
  ready: boolean;
} {
  const keys = getLaunchRequirementKeys(input, options);
  const checklist = keys.map((key) => ({
    key,
    label: getLaunchRequirementLabel(key),
    ready: isLaunchRequirementReady(key, input),
  }));
  const missingFields = checklist.filter((item) => !item.ready).map((item) => item.key);

  return {
    checklist,
    missingFields,
    ready: missingFields.length === 0,
  };
}

function joinLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function summarizeMissingLaunchFields(
  missingFields: LaunchRequirementKey[],
  maxItems = 2
): string {
  if (missingFields.length === 0) return "Ready to launch";
  const labels = missingFields.slice(0, maxItems).map(getLaunchRequirementLabel);
  const suffix =
    missingFields.length > maxItems
      ? ` + ${missingFields.length - maxItems} more`
      : "";
  return `Missing ${joinLabels(labels)}${suffix}`;
}
