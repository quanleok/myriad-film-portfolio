export const OPPORTUNITY_COMPANY_TYPES = ["studio", "brand", "client"] as const;
export const OPPORTUNITY_WORK_TYPES = [
  "freelance",
  "contract",
  "project",
  "studio_collaboration",
] as const;
export const OPPORTUNITY_LISTING_KINDS = ["job", "service_offer"] as const;
export const OPPORTUNITY_PROMOTION_TIERS = ["free", "featured"] as const;
export const OPPORTUNITY_STATUSES = [
  "draft",
  "payment_pending",
  "pending_review",
  "live",
  "rejected",
  "closed",
  "expired",
] as const;
export const OPPORTUNITY_BOARD_SORTS = [
  "featured",
  "newest",
  "highest_budget",
] as const;

export const OPPORTUNITY_PROMOTED_TAGS = [
  "Ads",
  "Film",
  "Music Video",
  "Sound Effect",
  "Other",
] as const;

export const OPPORTUNITY_FEATURED_LISTING_FEE_DEFAULT_CENTS = 2500;
export const OPPORTUNITY_FREE_LISTING_DAYS = 30;
export const OPPORTUNITY_FEATURED_LISTING_DAYS = 90;

export type OpportunityCompanyType = (typeof OPPORTUNITY_COMPANY_TYPES)[number];
export type OpportunityWorkType = (typeof OPPORTUNITY_WORK_TYPES)[number];
export type OpportunityListingKind = (typeof OPPORTUNITY_LISTING_KINDS)[number];
export type OpportunityPromotionTier = (typeof OPPORTUNITY_PROMOTION_TIERS)[number];
export type OpportunityListingStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type OpportunityBoardSort = (typeof OPPORTUNITY_BOARD_SORTS)[number];
export type OpportunityPromotedTag = (typeof OPPORTUNITY_PROMOTED_TAGS)[number];

export interface OpportunityListingRow {
  id: string;
  slug: string;
  poster_id: string;
  title: string;
  company_name: string;
  company_type: string;
  work_type: string;
  listing_kind: string;
  promotion_tier: string;
  promotion_ends_at: string | null;
  is_seeded: boolean;
  summary: string;
  description: string;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  timeline_text: string;
  location_text: string;
  service_tags: string[] | null;
  apply_url: string | null;
  contact_email: string | null;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_status: string | null;
  listing_fee_cents: number;
  paid_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityPosterSummary {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  websiteUrl: string | null;
}

export interface OpportunityListing {
  id: string;
  slug: string;
  posterId: string;
  title: string;
  companyName: string;
  companyType: OpportunityCompanyType;
  workType: OpportunityWorkType;
  listingKind: OpportunityListingKind;
  promotionTier: OpportunityPromotionTier;
  promotionEndsAt: string | null;
  isSeeded: boolean;
  summary: string;
  description: string;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  budgetLabel: string;
  timelineText: string;
  locationText: string;
  serviceTags: string[];
  applyUrl: string | null;
  contactEmail: string | null;
  status: OpportunityListingStatus;
  stripeCheckoutSessionId: string | null;
  stripePaymentStatus: string | null;
  listingFeeCents: number;
  paidAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  closedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  poster: OpportunityPosterSummary | null;
}

export interface OpportunityListingDraftInput {
  title: string;
  companyName: string;
  companyType: OpportunityCompanyType;
  workType: OpportunityWorkType;
  listingKind: OpportunityListingKind;
  promotionTier: OpportunityPromotionTier;
  summary: string;
  description: string;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  timelineText: string;
  locationText: string;
  serviceTags: string[];
  applyUrl: string | null;
  contactEmail: string | null;
}

export interface OpportunityFilters {
  query?: string;
  tag?: string;
  type?: string;
  kind?: string;
  tier?: string;
  sort?: string;
}

export const OPPORTUNITY_COMPANY_TYPE_LABELS: Record<
  OpportunityCompanyType,
  string
> = {
  studio: "Studio",
  brand: "Brand",
  client: "Client",
};

export const OPPORTUNITY_WORK_TYPE_LABELS: Record<OpportunityWorkType, string> = {
  freelance: "Freelance",
  contract: "Contract",
  project: "Project",
  studio_collaboration: "Studio Collaboration",
};
export const OPPORTUNITY_LISTING_KIND_LABELS: Record<
  OpportunityListingKind,
  string
> = {
  job: "Job",
  service_offer: "Service Offer",
};
export const OPPORTUNITY_PROMOTION_TIER_LABELS: Record<
  OpportunityPromotionTier,
  string
> = {
  free: "Free",
  featured: "Featured",
};

export const OPPORTUNITY_STATUS_LABELS: Record<
  OpportunityListingStatus,
  string
> = {
  draft: "Draft",
  payment_pending: "Payment Pending",
  pending_review: "Pending Review",
  live: "Live",
  rejected: "Rejected",
  closed: "Closed",
  expired: "Expired",
};

export function isOpportunityCompanyType(
  value: string
): value is OpportunityCompanyType {
  return (OPPORTUNITY_COMPANY_TYPES as readonly string[]).includes(value);
}

export function isOpportunityWorkType(
  value: string
): value is OpportunityWorkType {
  return (OPPORTUNITY_WORK_TYPES as readonly string[]).includes(value);
}

export function isOpportunityListingKind(
  value: string
): value is OpportunityListingKind {
  return (OPPORTUNITY_LISTING_KINDS as readonly string[]).includes(value);
}

export function isOpportunityPromotionTier(
  value: string
): value is OpportunityPromotionTier {
  return (OPPORTUNITY_PROMOTION_TIERS as readonly string[]).includes(value);
}

export function isOpportunityStatus(
  value: string
): value is OpportunityListingStatus {
  return (OPPORTUNITY_STATUSES as readonly string[]).includes(value);
}

export function isOpportunityBoardSort(
  value: string
): value is OpportunityBoardSort {
  return (OPPORTUNITY_BOARD_SORTS as readonly string[]).includes(value);
}

export function formatOpportunityBudget(
  minCents: number | null,
  maxCents: number | null
) {
  if (minCents === null && maxCents === null) return "Budget on request";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  if (minCents !== null && maxCents !== null) {
    if (minCents === maxCents) {
      return formatter.format(minCents / 100);
    }
    return `${formatter.format(minCents / 100)}–${formatter.format(maxCents / 100)}`;
  }

  if (minCents !== null) return `From ${formatter.format(minCents / 100)}`;
  return `Up to ${formatter.format((maxCents ?? 0) / 100)}`;
}

export function normalizeOpportunityTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const normalized = tag.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 10);
}

export function sanitizeOpportunityText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function createOpportunityBaseSlug(title: string, companyName: string) {
  const base = `${title} ${companyName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return base || "opportunity";
}

export function getOpportunityLifetimeDays(tier: OpportunityPromotionTier) {
  return tier === "featured"
    ? OPPORTUNITY_FEATURED_LISTING_DAYS
    : OPPORTUNITY_FREE_LISTING_DAYS;
}
