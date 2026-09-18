import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import {
  OPPORTUNITY_LISTING_KIND_LABELS,
  OPPORTUNITY_PROMOTION_TIER_LABELS,
  OPPORTUNITY_WORK_TYPE_LABELS,
  type OpportunityListing,
} from "@/lib/opportunities";

interface OpportunityCardProps {
  listing: OpportunityListing;
}

export function OpportunityCard({ listing }: OpportunityCardProps) {
  return (
    <article className="press-effect rounded-[1.75rem] bg-surface/85 p-5 transition-colors hover:bg-surface-hover/90">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
            <span className="font-semibold text-brand-500">
              {OPPORTUNITY_LISTING_KIND_LABELS[listing.listingKind]}
            </span>
            <span>•</span>
            <span>{OPPORTUNITY_WORK_TYPE_LABELS[listing.workType]}</span>
            {listing.promotionTier === "featured" ? (
              <>
                <span>•</span>
                <span className="text-brand-400">
                  {OPPORTUNITY_PROMOTION_TIER_LABELS[listing.promotionTier]}
                </span>
              </>
            ) : null}
            {listing.isSeeded ? (
              <>
                <span>•</span>
                <span className="text-amber-300">Sample</span>
              </>
            ) : null}
          </div>
          <span className="shrink-0 font-display text-2xl font-semibold tracking-[-0.04em] text-brand-500">
            {listing.budgetLabel}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
            <span className="font-medium text-text-secondary">
              {listing.companyName}
            </span>
            <span>•</span>
            <span>{timeAgo(listing.publishedAt ?? listing.createdAt)}</span>
          </div>
          <h3 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.04em] text-text-primary">
            {listing.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">
            {listing.summary}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={12} />
              {listing.locationText}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={12} />
              {listing.timelineText}
            </span>
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

        <div className="flex shrink-0 justify-end">
          <Link
            href={`/opportunities/${listing.slug}`}
            className="press-effect inline-flex items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
          >
            View listing
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
