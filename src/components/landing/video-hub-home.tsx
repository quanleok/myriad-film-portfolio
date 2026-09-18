"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Upload,
} from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import {
  OPPORTUNITY_LISTING_KIND_LABELS,
  OPPORTUNITY_WORK_TYPES,
  OPPORTUNITY_WORK_TYPE_LABELS,
  type OpportunityListing,
  type OpportunityListingKind,
  type OpportunityWorkType,
} from "@/lib/opportunities";
import {
  HIRE_AVAILABILITY_LABELS,
  HIRE_AVAILABILITY_OPTIONS,
  HIRE_PRICE_BAND_LABELS,
  HIRE_PRICE_BAND_OPTIONS,
  HIRE_SPECIALTY_OPTIONS,
  type HireAvailability,
  type HirePriceBand,
  type HireSpecialty,
  type TalentLandingData,
  type TalentSummary,
} from "@/lib/talent";

interface VideoHubHomeProps {
  talentData: TalentLandingData;
  listings: OpportunityListing[];
}

function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[1.75rem] bg-surface/80 px-6 py-10 text-center">
      <p className="font-display text-2xl font-semibold tracking-[-0.03em] text-text-primary">
        {title}
      </p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
        {body}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="press-effect mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function buildTalentHref({
  specialty = "",
  availability = "",
  price = "",
}: {
  specialty?: string;
  availability?: string;
  price?: string;
}) {
  const params = new URLSearchParams();
  if (specialty) params.set("specialty", specialty);
  if (availability) params.set("availability", availability);
  if (price) params.set("price", price);
  const next = params.toString();
  return next ? `/talent?${next}` : "/talent";
}

function getBudgetSortValue(listing: OpportunityListing) {
  return listing.budgetMaxCents ?? listing.budgetMinCents ?? 0;
}

function sortListings(
  listings: OpportunityListing[],
  sortOrder: "featured" | "newest" | "highest_budget"
) {
  if (sortOrder === "highest_budget") {
    return [...listings].sort(
      (left, right) => getBudgetSortValue(right) - getBudgetSortValue(left)
    );
  }

  if (sortOrder === "newest") {
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

function OpportunityRow({ listing }: { listing: OpportunityListing }) {
  return (
    <article className="press-effect rounded-[1.75rem] bg-surface/85 p-5 transition-colors hover:bg-surface-hover/90">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            <span className="font-semibold text-brand-500">
              {OPPORTUNITY_LISTING_KIND_LABELS[listing.listingKind]}
            </span>
            <span>•</span>
            <span>{OPPORTUNITY_WORK_TYPE_LABELS[listing.workType]}</span>
            {listing.promotionTier === "featured" ? (
              <>
                <span>•</span>
                <span className="text-brand-400">Featured</span>
              </>
            ) : null}
            {listing.isSeeded ? (
              <>
                <span>•</span>
                <span className="text-amber-300">Sample</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-secondary">
                {listing.companyName}
              </p>
              <h3 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.05em] text-text-primary">
                {listing.title}
              </h3>
            </div>
            <span className="shrink-0 font-display text-2xl font-semibold tracking-[-0.04em] text-brand-500">
              {listing.budgetLabel}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {listing.summary}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-tertiary">
            <span>{listing.locationText}</span>
            <span>•</span>
            <span>{listing.timelineText}</span>
            <span>•</span>
            <span>{OPPORTUNITY_WORK_TYPE_LABELS[listing.workType]}</span>
          </div>

          {listing.serviceTags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {listing.serviceTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-page/80 px-3 py-1.5 text-xs font-medium text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end lg:pt-1">
          <Link
            href={`/opportunities/${listing.slug}`}
            className="press-effect inline-flex items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
          >
            View listing
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CompactTalentLink({ talent }: { talent: TalentSummary }) {
  const meta = [talent.hireAvailabilityLabel, talent.hirePriceBandLabel]
    .filter(Boolean)
    .join(" • ");
  const specialties =
    talent.hireSpecialties.slice(0, 2).join(" • ") ||
    talent.specialties.slice(0, 2).join(" • ") ||
    talent.headline;

  return (
    <Link
      href={`/creator/${talent.username}`}
      className="press-effect flex items-center gap-3 rounded-[1.25rem] bg-page/70 px-3.5 py-3 transition-colors hover:bg-page"
    >
      {talent.avatarUrl ? (
        <Image
          src={talent.avatarUrl}
          alt={talent.displayName}
          width={48}
          height={48}
          className="h-12 w-12 rounded-[14px] bg-page object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-page text-sm font-semibold text-text-primary">
          {talent.displayName[0]?.toUpperCase() ?? "C"}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">
          {talent.displayName}
        </p>
        <p className="mt-0.5 truncate text-xs text-text-secondary">
          {specialties}
        </p>
        {meta ? (
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
            {meta}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function VideoHubHome({ talentData, listings }: VideoHubHomeProps) {
  const featuredTalentRail = talentData.featuredTalents.slice(0, 3);
  const [creatorRailOpen, setCreatorRailOpen] = useState(false);
  const [selectedKind, setSelectedKind] = useState<OpportunityListingKind | "">("");
  const [selectedType, setSelectedType] = useState<OpportunityWorkType | "">("");
  const [selectedSort, setSelectedSort] = useState<
    "featured" | "newest" | "highest_budget"
  >("featured");

  const visibleListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      if (selectedKind && listing.listingKind !== selectedKind) return false;
      if (selectedType && listing.workType !== selectedType) return false;
      return true;
    });

    return sortListings(filtered, selectedSort);
  }, [listings, selectedKind, selectedSort, selectedType]);

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <VideoHubHeader
        activeTab="jobs"
        primaryHref="/opportunities/post?kind=job&tier=free"
        primaryLabel="Post job"
        primaryShortLabel="Post"
        primaryIcon="plus"
      />

      <main className="brand-halo-bg mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <aside
            className={`shrink-0 overflow-hidden rounded-[1.75rem] bg-surface/70 transition-all duration-300 ${
              creatorRailOpen ? "xl:w-[276px]" : "xl:w-[88px]"
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              {creatorRailOpen ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500">
                    Creator filters
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Hire by specialty
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500">
                    Talent
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
                    Filters
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCreatorRailOpen((current) => !current)}
                className="press-effect inline-flex h-10 w-10 items-center justify-center rounded-full bg-page/80 text-text-secondary transition-colors hover:bg-page hover:text-text-primary"
                aria-expanded={creatorRailOpen}
                aria-label={creatorRailOpen ? "Collapse creator filters" : "Expand creator filters"}
              >
                {creatorRailOpen ? (
                  <PanelLeftClose size={18} />
                ) : (
                  <PanelLeftOpen size={18} />
                )}
              </button>
            </div>

            {creatorRailOpen ? (
              <div className="space-y-5 border-t border-border/60 px-4 py-4">
                <Link
                  href="/talent"
                  className="press-effect inline-flex items-center justify-between rounded-full bg-page/70 px-3.5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
                >
                  <span>Browse all creators</span>
                  <ArrowRight size={14} />
                </Link>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Specialty
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {HIRE_SPECIALTY_OPTIONS.map((specialty) => (
                      <Link
                        key={specialty}
                        href={buildTalentHref({ specialty })}
                        className="press-effect rounded-full bg-page/65 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-page hover:text-text-primary"
                      >
                        {specialty}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Availability
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {HIRE_AVAILABILITY_OPTIONS.map((availability) => (
                      <Link
                        key={availability}
                        href={buildTalentHref({ availability })}
                        className="press-effect rounded-full bg-page/65 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-page hover:text-text-primary"
                      >
                        {HIRE_AVAILABILITY_LABELS[availability]}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Pricing
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {HIRE_PRICE_BAND_OPTIONS.map((priceBand) => (
                      <Link
                        key={priceBand}
                        href={buildTalentHref({ price: priceBand })}
                        className="press-effect rounded-full bg-page/65 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-page hover:text-text-primary"
                      >
                        {HIRE_PRICE_BAND_LABELS[priceBand]}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t border-border/60 px-3 py-4">
                <Link
                  href="/talent"
                  className="press-effect inline-flex w-full items-center justify-center rounded-full bg-page/70 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:bg-page hover:text-text-primary"
                >
                  Browse
                </Link>
                <div className="space-y-2">
                  {HIRE_SPECIALTY_OPTIONS.slice(0, 3).map((specialty) => (
                    <Link
                      key={specialty}
                      href={buildTalentHref({ specialty })}
                      className="press-effect flex w-full items-center justify-center rounded-full bg-page/60 px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary transition-colors hover:bg-page hover:text-text-primary"
                    >
                      {specialty}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="min-w-0 flex-1 rounded-[1.75rem] bg-surface/72 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">
              The AI creator job board
            </p>

            <form
              action="/opportunities"
              className="mt-4 rounded-[1.6rem] border border-border/60 bg-page/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="font-display text-[clamp(2.3rem,5vw,4.6rem)] font-semibold leading-[0.9] tracking-[-0.085em] text-text-primary">
                    Search jobs first.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-text-secondary">
                    Search live jobs and service offers. Use creator filters only when you need to narrow who to hire.
                  </p>
                </div>

                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.15rem] bg-surface/90 px-4 py-4">
                    <Search size={18} className="shrink-0 text-text-tertiary" />
                    <input
                      type="search"
                      name="q"
                      placeholder="Search jobs, service offers, budgets, companies"
                      className="min-w-0 flex-1 bg-transparent text-base font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="press-effect inline-flex items-center justify-center rounded-[1.15rem] bg-brand-600 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                    >
                      Search jobs
                    </button>
                    <Link
                      href="/opportunities/post?kind=job"
                      className="press-effect inline-flex items-center justify-center rounded-[1.15rem] bg-surface px-5 py-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover"
                    >
                      Post job
                    </Link>
                    <Link
                      href="/opportunities/post?kind=service_offer"
                      className="press-effect inline-flex items-center justify-center rounded-[1.15rem] bg-surface px-5 py-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover"
                    >
                      Post service offer
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
                  <span className="rounded-full bg-surface/75 px-3 py-1.5">Free 30-day post</span>
                  <span className="rounded-full bg-surface/75 px-3 py-1.5">1 active free listing</span>
                  <span className="rounded-full bg-surface/75 px-3 py-1.5">$25 featured</span>
                  <span className="rounded-full bg-surface/75 px-3 py-1.5">90-day placement</span>
                </div>
              </div>
            </form>
          </section>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">
                Open roles
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] text-text-primary">
                Current listings
              </h2>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedKind("")}
                  className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    selectedKind === ""
                      ? "bg-brand-600 text-white"
                      : "bg-surface/80 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  All
                </button>
                {(["job", "service_offer"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setSelectedKind(kind)}
                    className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedKind === kind
                        ? "bg-brand-600 text-white"
                        : "bg-surface/80 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    {kind === "job"
                      ? `${OPPORTUNITY_LISTING_KIND_LABELS[kind]}s`
                      : "Service offers"}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedType("")}
                  className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    selectedType === ""
                      ? "bg-brand-600 text-white"
                      : "bg-surface/80 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  All arrangements
                </button>
                {OPPORTUNITY_WORK_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedType === type
                        ? "bg-brand-600 text-white"
                        : "bg-surface/80 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    {OPPORTUNITY_WORK_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {([
                  ["featured", "Featured"],
                  ["newest", "Newest"],
                  ["highest_budget", "Highest budget"],
                ] as const).map(([sortValue, label]) => (
                  <button
                    key={sortValue}
                    type="button"
                    onClick={() => setSelectedSort(sortValue)}
                    className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedSort === sortValue
                        ? "bg-brand-600 text-white"
                        : "bg-surface/80 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {visibleListings.length > 0 ? (
            <div className="stagger-up grid gap-4 xl:grid-cols-2">
              {visibleListings.map((listing) => (
                <OpportunityRow key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No listings matched that filter."
              body="Try another listing type or sort order. Sample listings will appear automatically until the real board fills in."
              actionHref="/opportunities/post?kind=job&tier=free"
              actionLabel="Post job"
            />
          )}
        </section>

        <section className="rounded-[1.75rem] bg-surface/80 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-500">
                <Upload size={18} />
              </div>
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">
                  Upload work as proof.
                </span>{" "}
                Buyers open creator profiles before they post or hire.
              </p>
            </div>
            <Link
              href="/upload"
              className="press-effect inline-flex w-fit items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
            >
              Upload a clip
            </Link>
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-surface/72 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                Featured creators
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-text-primary">
                Quick talent shortcuts
              </h2>
            </div>
            <Link
              href="/talent"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 transition-colors hover:text-brand-400"
            >
              Browse
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {featuredTalentRail.map((talent) => (
              <CompactTalentLink key={talent.id} talent={talent} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
