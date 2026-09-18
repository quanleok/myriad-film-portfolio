"use client";

import { useEffect, useState } from "react";
import type { OpportunityListing, OpportunityListingStatus } from "@/lib/opportunities";
import {
  OPPORTUNITY_LISTING_KIND_LABELS,
  OPPORTUNITY_PROMOTION_TIER_LABELS,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/opportunities";

type AdminFilter =
  | "pending_review"
  | "live"
  | "rejected"
  | "closed"
  | "expired"
  | "all";

const FILTERS: Array<{ value: AdminFilter; label: string }> = [
  { value: "pending_review", label: "Pending Review" },
  { value: "live", label: "Live" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "All" },
];

export function AdminOpportunitiesPage() {
  const [filter, setFilter] = useState<AdminFilter>("pending_review");
  const [listings, setListings] = useState<OpportunityListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadListings(nextFilter: AdminFilter) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/opportunities?status=${nextFilter}`);
      const data = (await response.json()) as { listings?: OpportunityListing[] };
      setListings(data.listings ?? []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings(filter);
  }, [filter]);

  async function patchListing(
    id: string,
    action: "approve" | "reject" | "close",
    rejectionReason?: string
  ) {
    setActionId(id);
    try {
      const response = await fetch(`/api/admin/opportunities/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, rejectionReason }),
      });

      const data = (await response.json()) as {
        error?: string;
        listing?: OpportunityListing;
      };

      if (!response.ok || !data.listing) {
        alert(data.error ?? "Unable to update listing.");
        return;
      }

      setListings((current) =>
        current.map((listing) => (listing.id === id ? data.listing! : listing))
      );
    } catch {
      alert("Unable to update listing.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              filter === item.value
                ? "bg-brand-600 text-white"
                : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-surface p-8 text-sm text-text-secondary">
          Loading…
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl bg-surface p-8 text-sm text-text-secondary">
          No listings in this queue.
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const busy = actionId === listing.id;

            return (
              <article
                key={listing.id}
                className="rounded-2xl bg-surface p-5 text-text-primary"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                      <span className="font-semibold uppercase tracking-[0.18em] text-brand-500">
                        {OPPORTUNITY_STATUS_LABELS[
                          listing.status as OpportunityListingStatus
                        ]}
                      </span>
                      <span>•</span>
                      <span>{OPPORTUNITY_LISTING_KIND_LABELS[listing.listingKind]}</span>
                      <span>•</span>
                      <span>{listing.companyName}</span>
                      <span>•</span>
                      <span>{listing.budgetLabel}</span>
                      <span>•</span>
                      <span>{OPPORTUNITY_PROMOTION_TIER_LABELS[listing.promotionTier]}</span>
                      {listing.isSeeded ? (
                        <>
                          <span>•</span>
                          <span className="text-amber-300">Sample</span>
                        </>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                      {listing.title}
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                      {listing.summary}
                    </p>
                    <div className="mt-3 text-xs text-text-tertiary">
                      {listing.poster?.displayName ?? listing.poster?.username ?? "Unknown poster"} •{" "}
                      {listing.locationText} • {listing.timelineText}
                    </div>
                    {listing.rejectionReason ? (
                      <div className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {listing.rejectionReason}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {listing.status === "pending_review" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => patchListing(listing.id, "approve")}
                          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                        >
                          {busy ? "Working…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            const reason = prompt("Rejection reason (optional):") ?? "";
                            patchListing(listing.id, "reject", reason);
                          }}
                          className="rounded-full bg-page px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}

                    {listing.status === "live" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => patchListing(listing.id, "close")}
                        className="rounded-full bg-page px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-70"
                      >
                        Close
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
