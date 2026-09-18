"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  OPPORTUNITY_LISTING_KIND_LABELS,
  OPPORTUNITY_PROMOTION_TIER_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  type OpportunityListing,
} from "@/lib/opportunities";

interface PosterOpportunitiesPageProps {
  initialListings: OpportunityListing[];
}

function canEdit(status: OpportunityListing["status"]) {
  return (
    status === "draft" ||
    status === "payment_pending" ||
    status === "pending_review"
  );
}

export function PosterOpportunitiesPage({
  initialListings,
}: PosterOpportunitiesPageProps) {
  const [listings, setListings] = useState(initialListings);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const sortedListings = useMemo(
    () =>
      [...listings].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [listings]
  );

  async function handleCheckout(listingId: string) {
    setSubmittingId(listingId);

    try {
      const response = await fetch("/api/opportunities/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId }),
      });

      const data = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        alert(data.error ?? "Unable to start checkout.");
        return;
      }

      window.location.href = data.url;
    } catch {
      alert("Unable to start checkout.");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleClose(listingId: string) {
    if (!confirm("Close this listing? It will disappear from the public board.")) {
      return;
    }

    setSubmittingId(listingId);

    try {
      const response = await fetch(`/api/opportunities/${listingId}/close`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        error?: string;
        listing?: OpportunityListing;
      };

      if (!response.ok || !data.listing) {
        alert(data.error ?? "Unable to close listing.");
        return;
      }

      setListings((current) =>
        current.map((listing) =>
          listing.id === listingId ? data.listing! : listing
        )
      );
    } catch {
      alert("Unable to close listing.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="space-y-4">
      {sortedListings.length === 0 ? (
        <div className="rounded-[1.75rem] bg-surface/80 p-8 text-center">
          <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-text-primary">
            No listings yet.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-secondary">
            Create a free or featured posting, then send it into review.
          </p>
          <Link
            href="/opportunities/post"
            className="press-effect mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            Post a listing
          </Link>
        </div>
      ) : (
        sortedListings.map((listing) => {
          const busy = submittingId === listing.id;
          const editHref = `/opportunities/post?id=${listing.id}`;
          const relistHref = `/opportunities/post?duplicate=${listing.id}`;

          return (
            <article
              key={listing.id}
              className="rounded-[1.75rem] bg-surface/85 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                    <span className="font-semibold uppercase tracking-[0.18em] text-brand-500">
                      {OPPORTUNITY_STATUS_LABELS[listing.status]}
                    </span>
                    <span>•</span>
                    <span>{OPPORTUNITY_LISTING_KIND_LABELS[listing.listingKind]}</span>
                    <span>•</span>
                    <span>{listing.companyName}</span>
                    <span>•</span>
                    <span>{listing.budgetLabel}</span>
                    <span>•</span>
                    <span>{OPPORTUNITY_PROMOTION_TIER_LABELS[listing.promotionTier]}</span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                    {listing.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    {listing.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-tertiary">
                    <span>{listing.timelineText}</span>
                    <span>•</span>
                    <span>{listing.locationText}</span>
                    {listing.expiresAt ? (
                      <>
                        <span>•</span>
                        <span>
                          Expires {new Date(listing.expiresAt).toLocaleDateString()}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {listing.rejectionReason ? (
                    <div className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      Rejection note: {listing.rejectionReason}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  {listing.status === "live" ? (
                    <Link
                      href={`/opportunities/${listing.slug}`}
                      className="press-effect inline-flex items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
                    >
                      View listing
                    </Link>
                  ) : null}

                  {canEdit(listing.status) ? (
                    <Link
                      href={editHref}
                      className="press-effect inline-flex items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
                    >
                      Edit
                    </Link>
                  ) : (
                    <Link
                      href={relistHref}
                      className="press-effect inline-flex items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page"
                    >
                      Relist
                    </Link>
                  )}

                  {listing.promotionTier === "featured" &&
                  (listing.status === "draft" ||
                    listing.status === "payment_pending") && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCheckout(listing.id)}
                      className="press-effect inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {busy ? "Loading…" : "Pay $25 & submit"}
                    </button>
                  )}

                  {listing.status === "live" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleClose(listing.id)}
                      className="press-effect inline-flex items-center gap-2 rounded-full bg-page/80 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {busy ? "Closing…" : "Close"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
