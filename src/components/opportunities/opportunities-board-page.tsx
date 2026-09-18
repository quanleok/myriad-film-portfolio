import Link from "next/link";
import { Search } from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import {
  OPPORTUNITY_BOARD_SORTS,
  OPPORTUNITY_LISTING_KIND_LABELS,
  OPPORTUNITY_LISTING_KINDS,
  OPPORTUNITY_PROMOTED_TAGS,
  OPPORTUNITY_WORK_TYPES,
  OPPORTUNITY_WORK_TYPE_LABELS,
  type OpportunityBoardSort,
  type OpportunityListing,
} from "@/lib/opportunities";
import { formatPrice } from "@/lib/utils";

interface OpportunitiesBoardPageProps {
  listings: OpportunityListing[];
  query: string;
  kind: string;
  tag: string;
  type: string;
  sort: string;
  listingFeeCents: number;
}

function buildHref({
  query,
  kind,
  tag,
  type,
  sort,
}: {
  query: string;
  kind: string;
  tag: string;
  type: string;
  sort: string;
}) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (kind.trim()) params.set("kind", kind.trim());
  if (tag.trim()) params.set("tag", tag.trim());
  if (type.trim()) params.set("type", type.trim());
  if (sort.trim() && sort !== "featured") params.set("sort", sort.trim());
  const next = params.toString();
  return next ? `/opportunities?${next}` : "/opportunities";
}

export function OpportunitiesBoardPage({
  listings,
  query,
  kind,
  tag,
  type,
  sort,
  listingFeeCents,
}: OpportunitiesBoardPageProps) {
  const activeSort = (sort || "featured") as OpportunityBoardSort;

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <VideoHubHeader
        activeTab="jobs"
        primaryHref="/opportunities/post?kind=job&tier=free"
        primaryLabel="Post job"
        primaryShortLabel="Post"
        primaryIcon="plus"
      />

      <main className="brand-halo-bg mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-[1.75rem] bg-surface/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">
                Jobs board
              </p>
              <h1 className="mt-2 font-display text-[clamp(1.85rem,4vw,2.75rem)] font-semibold tracking-[-0.06em] text-text-primary">
                Search jobs and service offers.
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
              <span className="rounded-full bg-page/70 px-3 py-1.5">
                Free 30-day posts
              </span>
              <span className="rounded-full bg-page/70 px-3 py-1.5">
                Featured {formatPrice(listingFeeCents)} / 90 days
              </span>
            </div>
          </div>

          <form action="/opportunities" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.1rem] bg-page/85 px-4 py-3">
                <Search size={18} className="shrink-0 text-text-tertiary" />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search jobs, services, companies, budgets"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="press-effect inline-flex items-center justify-center gap-2 rounded-[1.1rem] bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                >
                  Search jobs
                </button>
                <Link
                  href="/opportunities/post?kind=job"
                  className="press-effect inline-flex items-center gap-2 rounded-[1.1rem] bg-page/80 px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
                >
                  Post job
                </Link>
                <Link
                  href="/opportunities/post?kind=service_offer"
                  className="press-effect inline-flex items-center gap-2 rounded-[1.1rem] bg-page/80 px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
                >
                  Post service offer
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ query, kind: "", tag, type, sort: activeSort })}
                className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  kind
                    ? "bg-page/80 text-text-secondary hover:bg-page hover:text-text-primary"
                    : "bg-brand-600 text-white"
                }`}
              >
                All
              </Link>
              {OPPORTUNITY_LISTING_KINDS.map((item) => {
                const active = item === kind;
                return (
                  <Link
                    key={item}
                    href={buildHref({
                      query,
                      kind: active ? "" : item,
                      tag,
                      type,
                      sort: activeSort,
                    })}
                    className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-brand-600 text-white"
                        : "bg-page/80 text-text-secondary hover:bg-page hover:text-text-primary"
                    }`}
                  >
                    {item === "job"
                      ? OPPORTUNITY_LISTING_KIND_LABELS[item] + "s"
                      : "Service offers"}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ query, kind, tag, type: "", sort: activeSort })}
                className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  type
                    ? "bg-page/80 text-text-secondary hover:bg-page hover:text-text-primary"
                    : "bg-brand-600 text-white"
                }`}
              >
                All arrangements
              </Link>
              {OPPORTUNITY_WORK_TYPES.map((item) => {
                const active = item === type;
                return (
                  <Link
                    key={item}
                    href={buildHref({
                      query,
                      kind,
                      tag,
                      type: active ? "" : item,
                      sort: activeSort,
                    })}
                    className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-brand-600 text-white"
                        : "bg-page/80 text-text-secondary hover:bg-page hover:text-text-primary"
                    }`}
                  >
                    {OPPORTUNITY_WORK_TYPE_LABELS[item]}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {OPPORTUNITY_BOARD_SORTS.map((item) => {
                const active = item === activeSort;
                return (
                  <Link
                    key={item}
                    href={buildHref({
                      query,
                      kind,
                      tag,
                      type,
                      sort: active ? "featured" : item,
                    })}
                    className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-brand-600 text-white"
                        : "bg-page/80 text-text-secondary hover:bg-page hover:text-text-primary"
                    }`}
                  >
                    {item === "featured"
                      ? "Featured"
                      : item === "newest"
                        ? "Newest"
                        : "Highest budget"}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref({ query, kind, tag: "", type, sort: activeSort })}
                className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  tag
                    ? "bg-page/80 text-text-secondary hover:bg-page hover:text-text-primary"
                    : "bg-surface text-text-secondary"
                }`}
              >
                All specialties
              </Link>
              {OPPORTUNITY_PROMOTED_TAGS.map((item) => {
                const active = item.toLowerCase() === tag.toLowerCase();
                return (
                  <Link
                    key={item}
                    href={buildHref({
                      query,
                      kind,
                      tag: active ? "" : item,
                      type,
                      sort: activeSort,
                    })}
                    className={`press-effect rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-brand-600 text-white"
                        : "bg-page/80 text-text-secondary hover:bg-page hover:text-text-primary"
                    }`}
                  >
                    {item}
                  </Link>
                );
              })}
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">
                Board
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] text-text-primary">
                {listings.length} listing{listings.length === 1 ? "" : "s"}
              </h2>
            </div>
          </div>

          {listings.length > 0 ? (
            <div className="stagger-up mt-5 grid gap-4 xl:grid-cols-2">
              {listings.map((listing) => (
                <OpportunityCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.75rem] bg-surface/80 px-6 py-10 text-center">
              <p className="font-display text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                No listings matched that search.
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                Clear the filters or post the first listing in this lane.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/opportunities"
                  className="press-effect inline-flex items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
                >
                  Clear filters
                </Link>
                <Link
                  href="/opportunities/post?kind=job&tier=free"
                  className="press-effect inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                >
                  Post job
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
