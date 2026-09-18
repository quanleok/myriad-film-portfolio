import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  createOpportunityBaseSlug,
  formatOpportunityBudget,
  type OpportunityCompanyType,
  type OpportunityFilters,
  getOpportunityLifetimeDays,
  isOpportunityListingKind,
  isOpportunityPromotionTier,
  OPPORTUNITY_FEATURED_LISTING_FEE_DEFAULT_CENTS,
  type OpportunityListingKind,
  type OpportunityListing,
  type OpportunityListingRow,
  type OpportunityPromotionTier,
  OPPORTUNITY_WORK_TYPES,
  type OpportunityPosterSummary,
  type OpportunityWorkType,
} from "@/lib/opportunities";

const PUBLIC_SELECT =
  "id, slug, poster_id, title, company_name, company_type, work_type, listing_kind, promotion_tier, promotion_ends_at, is_seeded, summary, description, budget_min_cents, budget_max_cents, timeline_text, location_text, service_tags, apply_url, contact_email, status, stripe_checkout_session_id, stripe_payment_status, listing_fee_cents, paid_at, published_at, expires_at, closed_at, rejection_reason, created_at, updated_at";

const EDITABLE_STATUSES = new Set(["draft", "payment_pending", "pending_review"]);
const FREE_LIMIT_ACTIVE_STATUSES = ["draft", "payment_pending", "pending_review", "live"];
const SAMPLE_PUBLISHED_AT = "2026-03-25T16:00:00.000Z";

type PosterRow = {
  id: string;
  display_name: string | null;
  username: string;
  avatar_url: string | null;
  website_url: string | null;
};

function sanitizeQuery(value: string) {
  return value.trim().replace(/[%_,]/g, " ");
}

function toPosterMap(rows: PosterRow[]) {
  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        displayName: row.display_name ?? row.username,
        username: row.username,
        avatarUrl: row.avatar_url,
        websiteUrl: row.website_url,
      } satisfies OpportunityPosterSummary,
    ])
  );
}

function mapListing(
  row: OpportunityListingRow,
  posterMap: Map<string, OpportunityPosterSummary>
): OpportunityListing {
  return {
    id: row.id,
    slug: row.slug,
    posterId: row.poster_id,
    title: row.title,
    companyName: row.company_name,
    companyType: row.company_type as OpportunityCompanyType,
    workType: row.work_type as OpportunityWorkType,
    listingKind: row.listing_kind as OpportunityListingKind,
    promotionTier: row.promotion_tier as OpportunityPromotionTier,
    promotionEndsAt: row.promotion_ends_at,
    isSeeded: Boolean(row.is_seeded),
    summary: row.summary,
    description: row.description,
    budgetMinCents: row.budget_min_cents,
    budgetMaxCents: row.budget_max_cents,
    budgetLabel: formatOpportunityBudget(row.budget_min_cents, row.budget_max_cents),
    timelineText: row.timeline_text,
    locationText: row.location_text,
    serviceTags: row.service_tags ?? [],
    applyUrl: row.apply_url,
    contactEmail: row.contact_email,
    status: row.status as OpportunityListing["status"],
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentStatus: row.stripe_payment_status,
    listingFeeCents: row.listing_fee_cents,
    paidAt: row.paid_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    closedAt: row.closed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    poster: posterMap.get(row.poster_id) ?? null,
  };
}

function buildSampleOpportunityListings(): OpportunityListing[] {
  const sampleData: Array<{
    slug: string;
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
  }> = [
    {
      slug: "sample-launch-trailer-campaign",
      title: "Launch trailer for AI product campaign",
      companyName: "Northline Labs",
      companyType: "brand",
      workType: "freelance",
      listingKind: "job",
      promotionTier: "featured",
      summary: "Need a fast-turn launch trailer plus social trims for an AI product release.",
      description:
        "We are looking for a creator to cut a sharp launch trailer, short social edits, and a still frame package for a product campaign.",
      budgetMinCents: 400000,
      budgetMaxCents: 800000,
      timelineText: "2 weeks",
      locationText: "Remote",
      serviceTags: ["Ads", "Film"],
    },
    {
      slug: "sample-sci-fi-pitch-visuals",
      title: "Worldbuilding visuals for sci-fi pitch deck",
      companyName: "Vanta House",
      companyType: "client",
      workType: "project",
      listingKind: "job",
      promotionTier: "featured",
      summary: "Concept frames, environments, and polished mood boards for investor materials.",
      description:
        "Seeking a visual worldbuilder for a sci-fi pitch package. Deliverables include environment frames, palette references, and tone boards.",
      budgetMinCents: 1200000,
      budgetMaxCents: 2000000,
      timelineText: "4–6 weeks",
      locationText: "Remote",
      serviceTags: ["Film", "Other"],
    },
    {
      slug: "sample-audio-brand-pack",
      title: "Sound design pack for branded shorts",
      companyName: "Signal Echo",
      companyType: "studio",
      workType: "contract",
      listingKind: "job",
      promotionTier: "free",
      summary: "Looking for punchy SFX, transitions, and branded audio beds for short-form content.",
      description:
        "We need a sound-focused creator to build a short-form audio pack for repeat branded content across three campaigns.",
      budgetMinCents: 150000,
      budgetMaxCents: 350000,
      timelineText: "10 days",
      locationText: "Remote",
      serviceTags: ["Sound Effect", "Ads"],
    },
    {
      slug: "sample-trailer-package-service",
      title: "Trailer package service for launch campaigns",
      companyName: "Saga Lore AI",
      companyType: "studio",
      workType: "freelance",
      listingKind: "service_offer",
      promotionTier: "featured",
      summary: "I build trailer-first campaign packages with a hero cut, vertical trims, and poster frames.",
      description:
        "Service offer for trailer-led launch campaigns. Includes one hero trailer, three cutdowns, key stills, and export-ready assets.",
      budgetMinCents: 250000,
      budgetMaxCents: 600000,
      timelineText: "From 7 days",
      locationText: "Remote",
      serviceTags: ["Ads", "Film"],
    },
    {
      slug: "sample-music-video-direction-service",
      title: "Music video concept and prompt direction",
      companyName: "PsyopAnime",
      companyType: "studio",
      workType: "project",
      listingKind: "service_offer",
      promotionTier: "free",
      summary: "Offer for artists who need a full AI-assisted music video direction and prompt package.",
      description:
        "I create music-video concepts, shot breakdowns, prompt packs, and final edit direction for artists and labels.",
      budgetMinCents: 180000,
      budgetMaxCents: 500000,
      timelineText: "From 2 weeks",
      locationText: "Remote",
      serviceTags: ["Music Video", "Film"],
    },
    {
      slug: "sample-sfx-cleanup-service",
      title: "Sound effect polish for AI clips and reels",
      companyName: "Dex Labs",
      companyType: "studio",
      workType: "studio_collaboration",
      listingKind: "service_offer",
      promotionTier: "free",
      summary: "I clean up flat AI edits with SFX, transitions, hit accents, and final mix polish.",
      description:
        "Service for creators who already have the visuals and need stronger audio impact before publishing or pitching.",
      budgetMinCents: 75000,
      budgetMaxCents: 250000,
      timelineText: "From 3 days",
      locationText: "Remote",
      serviceTags: ["Sound Effect", "Other"],
    },
  ];

  return sampleData.map((sample, index) => {
    const createdAt = new Date(
      new Date(SAMPLE_PUBLISHED_AT).getTime() - index * 1000 * 60 * 60 * 18
    ).toISOString();
    const expiresAt = getOpportunityExpiryISOStringForTier(sample.promotionTier);

    return {
      id: `sample-opportunity-${index + 1}`,
      slug: sample.slug,
      posterId: `sample-poster-${index + 1}`,
      title: sample.title,
      companyName: sample.companyName,
      companyType: sample.companyType,
      workType: sample.workType,
      listingKind: sample.listingKind,
      promotionTier: sample.promotionTier,
      promotionEndsAt:
        sample.promotionTier === "featured" ? expiresAt : null,
      isSeeded: true,
      summary: sample.summary,
      description: sample.description,
      budgetMinCents: sample.budgetMinCents,
      budgetMaxCents: sample.budgetMaxCents,
      budgetLabel: formatOpportunityBudget(
        sample.budgetMinCents,
        sample.budgetMaxCents
      ),
      timelineText: sample.timelineText,
      locationText: sample.locationText,
      serviceTags: sample.serviceTags,
      applyUrl: null,
      contactEmail: null,
      status: "live",
      stripeCheckoutSessionId: null,
      stripePaymentStatus: null,
      listingFeeCents: getOpportunityListingFeeForTier(sample.promotionTier),
      paidAt: sample.promotionTier === "featured" ? createdAt : null,
      publishedAt: createdAt,
      expiresAt,
      closedAt: null,
      rejectionReason: null,
      createdAt,
      updatedAt: createdAt,
      poster: null,
    };
  });
}

function listingMatchesFilters(listing: OpportunityListing, filters: OpportunityFilters) {
  const normalizedQuery = sanitizeQuery(filters.query ?? "").toLowerCase();
  const kind = (filters.kind ?? "").trim();
  const tier = (filters.tier ?? "").trim();
  const type = (filters.type ?? "").trim();
  const tag = (filters.tag ?? "").trim().toLowerCase();

  if (kind && listing.listingKind !== kind) return false;
  if (tier && listing.promotionTier !== tier) return false;
  if (type && listing.workType !== type) return false;
  if (
    tag &&
    !listing.serviceTags.some((serviceTag) => serviceTag.toLowerCase() === tag)
  ) {
    return false;
  }

  if (!normalizedQuery) return true;

  return [
    listing.title,
    listing.companyName,
    listing.summary,
    listing.description,
    listing.locationText,
    listing.timelineText,
    ...listing.serviceTags,
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

function sortOpportunityListings(
  listings: OpportunityListing[],
  sort: string
) {
  if (sort === "highest_budget") {
    return [...listings].sort(
      (left, right) =>
        (right.budgetMaxCents ?? right.budgetMinCents ?? 0) -
        (left.budgetMaxCents ?? left.budgetMinCents ?? 0)
    );
  }

  if (sort === "newest") {
    return [...listings].sort(
      (left, right) =>
        new Date(right.publishedAt ?? right.createdAt).getTime() -
        new Date(left.publishedAt ?? left.createdAt).getTime()
    );
  }

  return [...listings].sort((left, right) => {
    const tierDelta =
      Number(right.promotionTier === "featured") -
      Number(left.promotionTier === "featured");

    if (tierDelta !== 0) return tierDelta;

    return (
      new Date(right.publishedAt ?? right.createdAt).getTime() -
      new Date(left.publishedAt ?? left.createdAt).getTime()
    );
  });
}

function isListingPubliclyVisible(row: OpportunityListingRow) {
  if (row.status !== "live") return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

async function fetchPosterMap(posterIds: string[]) {
  const ids = [...new Set(posterIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, OpportunityPosterSummary>();

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, username, avatar_url, website_url")
    .in("id", ids);

  return toPosterMap((data ?? []) as PosterRow[]);
}

export function getOpportunityListingFeeCents() {
  const raw = Number.parseInt(
    process.env.OPPORTUNITY_LISTING_FEE_CENTS ??
      `${OPPORTUNITY_FEATURED_LISTING_FEE_DEFAULT_CENTS}`,
    10
  );

  if (!Number.isFinite(raw) || raw <= 0) {
    return OPPORTUNITY_FEATURED_LISTING_FEE_DEFAULT_CENTS;
  }

  return raw;
}

export function getOpportunityListingFeeForTier(tier: OpportunityPromotionTier) {
  return tier === "featured" ? getOpportunityListingFeeCents() : 0;
}

export function getOpportunityExpiryISOStringForTier(tier: OpportunityPromotionTier) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getOpportunityLifetimeDays(tier));
  return expiresAt.toISOString();
}

export function getOpportunityEditableStatuses() {
  return EDITABLE_STATUSES;
}

export async function expireStaleOpportunityListings() {
  const admin = createAdminClient();
  await admin
    .from("opportunity_listings")
    .update({ status: "expired", promotion_ends_at: null })
    .eq("status", "live")
    .not("expires_at", "is", null)
    .lt("expires_at", new Date().toISOString());
}

export async function ensureUniqueOpportunitySlug(
  title: string,
  companyName: string,
  excludeId?: string
) {
  const admin = createAdminClient();
  const base = createOpportunityBaseSlug(title, companyName);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let query = admin
      .from("opportunity_listings")
      .select("id")
      .eq("slug", candidate);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function listPublicOpportunityListings(
  filters: OpportunityFilters = {}
) {
  await expireStaleOpportunityListings();

  const admin = createAdminClient();
  const sort = (filters.sort ?? "").trim();

  let query = admin
    .from("opportunity_listings")
    .select(PUBLIC_SELECT)
    .eq("status", "live")
    .order("published_at", { ascending: false, nullsFirst: false });

  const { data, error } = await query;

  if (error) {
    console.error("[opportunities] list public error:", error);
    return sortOpportunityListings(
      buildSampleOpportunityListings().filter((listing) =>
        listingMatchesFilters(listing, filters)
      ),
      sort
    );
  }

  const publicRows = ((data ?? []) as OpportunityListingRow[]).filter(
    isListingPubliclyVisible
  );
  const realRows = publicRows.filter((row) => !row.is_seeded);
  const seededRows = publicRows.filter((row) => row.is_seeded);

  const posterMap = await fetchPosterMap(publicRows.map((row) => row.poster_id));
  const realListings = realRows.map((row) => mapListing(row, posterMap));
  const dbSeededListings = seededRows.map((row) => mapListing(row, posterMap));
  const fallbackSeededListings =
    realListings.length < 6 && dbSeededListings.length < 6
      ? buildSampleOpportunityListings().filter(
          (listing) =>
            !dbSeededListings.some((dbListing) => dbListing.slug === listing.slug)
        )
      : [];

  const listings = [...realListings, ...dbSeededListings, ...fallbackSeededListings]
    .filter((listing) => listingMatchesFilters(listing, filters));

  return sortOpportunityListings(listings, sort);
}

export async function getPublicOpportunityBySlug(slug: string) {
  await expireStaleOpportunityListings();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("opportunity_listings")
    .select(PUBLIC_SELECT)
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();

  if (error) {
    console.error("[opportunities] get public slug error:", error);
    return null;
  }

  if (!data || !isListingPubliclyVisible(data as OpportunityListingRow)) return null;
  const posterMap = await fetchPosterMap([data.poster_id]);
  return mapListing(data as OpportunityListingRow, posterMap);
}

export async function getOpportunityBySlugForApi(slug: string) {
  return getPublicOpportunityBySlug(slug);
}

export async function getPosterOpportunityById(userId: string, id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("opportunity_listings")
    .select(PUBLIC_SELECT)
    .eq("poster_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[opportunities] get poster listing error:", error);
    return null;
  }

  if (!data) return null;
  const posterMap = await fetchPosterMap([data.poster_id]);
  return mapListing(data as OpportunityListingRow, posterMap);
}

export async function listPosterOpportunityListings(userId: string) {
  await expireStaleOpportunityListings();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("opportunity_listings")
    .select(PUBLIC_SELECT)
    .eq("poster_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[opportunities] list poster error:", error);
    return [];
  }

  const rows = (data ?? []) as OpportunityListingRow[];
  const posterMap = await fetchPosterMap([userId]);
  return rows.map((row) => mapListing(row, posterMap));
}

export async function countPosterActiveFreeListings(
  userId: string,
  excludeId?: string
) {
  const admin = createAdminClient();
  let query = admin
    .from("opportunity_listings")
    .select("id, expires_at", { count: "exact", head: false })
    .eq("poster_id", userId)
    .eq("promotion_tier", "free")
    .in("status", FREE_LIMIT_ACTIVE_STATUSES);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[opportunities] count free listings error:", error);
    return 0;
  }

  return ((data ?? []) as Array<{ expires_at: string | null }>).filter((row) => {
    if (!row.expires_at) return true;
    return new Date(row.expires_at).getTime() > Date.now();
  }).length;
}

export async function listAdminOpportunityListings(status = "all") {
  await expireStaleOpportunityListings();

  const admin = createAdminClient();
  let query = admin
    .from("opportunity_listings")
    .select(PUBLIC_SELECT)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[opportunities] admin list error:", error);
    return [];
  }

  const rows = (data ?? []) as OpportunityListingRow[];
  const posterMap = await fetchPosterMap(rows.map((row) => row.poster_id));
  return rows.map((row) => mapListing(row, posterMap));
}

export async function getAdminOpportunityById(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("opportunity_listings")
    .select(PUBLIC_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[opportunities] admin detail error:", error);
    return null;
  }

  if (!data) return null;
  const posterMap = await fetchPosterMap([data.poster_id]);
  return mapListing(data as OpportunityListingRow, posterMap);
}
