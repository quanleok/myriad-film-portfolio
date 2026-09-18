"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  OPPORTUNITY_COMPANY_TYPE_LABELS,
  OPPORTUNITY_COMPANY_TYPES,
  OPPORTUNITY_LISTING_KINDS,
  OPPORTUNITY_PROMOTION_TIER_LABELS,
  OPPORTUNITY_PROMOTION_TIERS,
  OPPORTUNITY_WORK_TYPE_LABELS,
  OPPORTUNITY_WORK_TYPES,
  type OpportunityListing,
} from "@/lib/opportunities";
import { formatPrice } from "@/lib/utils";

interface OpportunityPostFormProps {
  listingFeeCents: number;
  draftId?: string | null;
  initialListing?: OpportunityListing | null;
  mode?: "create" | "edit" | "relist";
  defaultKind?: string | null;
  defaultTier?: string | null;
}

type FormState = {
  title: string;
  companyName: string;
  companyType: string;
  workType: string;
  listingKind: string;
  promotionTier: string;
  summary: string;
  description: string;
  budgetMinDollars: string;
  budgetMaxDollars: string;
  timelineText: string;
  locationText: string;
  serviceTags: string;
  applyUrl: string;
  contactEmail: string;
};

function toInitialState(
  listing?: OpportunityListing | null,
  defaultKind?: string | null,
  defaultTier?: string | null
): FormState {
  return {
    title: listing?.title ?? "",
    companyName: listing?.companyName ?? "",
    companyType: listing?.companyType ?? OPPORTUNITY_COMPANY_TYPES[0],
    workType: listing?.workType ?? OPPORTUNITY_WORK_TYPES[0],
    listingKind: listing?.listingKind ?? defaultKind ?? OPPORTUNITY_LISTING_KINDS[0],
    promotionTier:
      listing?.promotionTier ?? defaultTier ?? OPPORTUNITY_PROMOTION_TIERS[0],
    summary: listing?.summary ?? "",
    description: listing?.description ?? "",
    budgetMinDollars:
      listing?.budgetMinCents !== null && listing?.budgetMinCents !== undefined
        ? String(Math.round(listing.budgetMinCents / 100))
        : "",
    budgetMaxDollars:
      listing?.budgetMaxCents !== null && listing?.budgetMaxCents !== undefined
        ? String(Math.round(listing.budgetMaxCents / 100))
        : "",
    timelineText: listing?.timelineText ?? "",
    locationText: listing?.locationText ?? "",
    serviceTags: listing?.serviceTags?.join(", ") ?? "",
    applyUrl: listing?.applyUrl ?? "",
    contactEmail: listing?.contactEmail ?? "",
  };
}

function dollarsToCents(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return NaN;
  return Math.round(parsed * 100);
}

const FIELD_CLASS =
  "w-full rounded-2xl border border-border/70 bg-surface/95 px-4 py-3 text-sm font-medium text-text-primary placeholder:text-text-tertiary shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors [caret-color:var(--role-brand-500)] [-webkit-text-fill-color:var(--text-primary)] [color-scheme:dark] focus:border-brand-500/55 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/15";

const TEXTAREA_CLASS =
  "w-full rounded-[1.5rem] border border-border/70 bg-surface/95 px-4 py-3 text-sm font-medium leading-6 text-text-primary placeholder:text-text-tertiary shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors [caret-color:var(--role-brand-500)] [-webkit-text-fill-color:var(--text-primary)] [color-scheme:dark] focus:border-brand-500/55 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/15";

export function OpportunityPostForm({
  listingFeeCents,
  draftId = null,
  initialListing,
  mode = "create",
  defaultKind = null,
  defaultTier = null,
}: OpportunityPostFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    toInitialState(initialListing, defaultKind, defaultTier)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heading = useMemo(() => {
    switch (mode) {
      case "edit":
        return "Edit listing";
      case "relist":
        return "Relist from previous posting";
      default:
        return "Post job or service offer";
    }
  }, [mode]);

  const helper = useMemo(() => {
    switch (mode) {
      case "edit":
        return "Update the listing, tier, or contact target before it goes live.";
      case "relist":
        return "This is prefilled from an earlier listing. Review it, choose a tier, and resubmit.";
      default:
        return "Choose a listing kind, choose a tier, then fill in the brief.";
    }
  }, [mode]);

  const isServiceOffer = form.listingKind === "service_offer";
  const isFeatured = form.promotionTier === "featured";
  const submitLabel = submitting
    ? "Saving…"
    : isFeatured
      ? "Continue to checkout"
      : draftId
        ? "Update free listing"
        : "Submit free listing";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const budgetMinCents = dollarsToCents(form.budgetMinDollars);
      const budgetMaxCents = dollarsToCents(form.budgetMaxDollars);

      if (Number.isNaN(budgetMinCents) || Number.isNaN(budgetMaxCents)) {
        throw new Error("Budget values must be valid dollar amounts.");
      }

      const draftResponse = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: draftId,
          title: form.title,
          companyName: form.companyName,
          companyType: form.companyType,
          workType: form.workType,
          listingKind: form.listingKind,
          promotionTier: form.promotionTier,
          summary: form.summary,
          description: form.description,
          budgetMinCents,
          budgetMaxCents,
          timelineText: form.timelineText,
          locationText: form.locationText,
          serviceTags: form.serviceTags
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          applyUrl: form.applyUrl,
          contactEmail: form.contactEmail,
        }),
      });

      const draftData = (await draftResponse.json()) as {
        error?: string;
        listingId?: string;
        status?: string;
        requiresPayment?: boolean;
      };

      if (!draftResponse.ok || !draftData.listingId) {
        throw new Error(draftData.error ?? "Unable to save listing.");
      }

      if (draftData.requiresPayment) {
        const checkoutResponse = await fetch("/api/opportunities/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ listingId: draftData.listingId }),
        });

        const checkoutData = (await checkoutResponse.json()) as {
          error?: string;
          url?: string;
        };

        if (!checkoutResponse.ok || !checkoutData.url) {
          throw new Error(checkoutData.error ?? "Unable to start checkout.");
        }

        window.location.href = checkoutData.url;
        return;
      }

      window.location.href = `/opportunities/post/success?listing=${encodeURIComponent(
        draftData.listingId
      )}`;
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit listing.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] bg-surface/80 p-6 sm:p-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">
          Opportunity posting
        </p>
        <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold tracking-[-0.06em] text-text-primary">
          {heading}
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">{helper}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.5rem] border border-border/60 bg-page/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
              1. Listing type
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {OPPORTUNITY_LISTING_KINDS.map((listingKind) => {
                const active = form.listingKind === listingKind;
                return (
                  <button
                    key={listingKind}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({ ...current, listingKind }))
                    }
                    className={`rounded-[1.35rem] border px-4 py-4 text-left transition-all ${
                      active
                        ? "border-brand-500/40 bg-brand-500/10 text-text-primary"
                        : "border-border/60 bg-surface/70 text-text-secondary hover:bg-surface"
                    }`}
                  >
                    <p className="text-sm font-semibold text-inherit">
                      {listingKind === "job" ? "Post job" : "Post service offer"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-text-tertiary">
                      {listingKind === "job"
                        ? "Hire a creator or studio."
                        : "Offer your service to clients browsing the board."}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/60 bg-page/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
              2. Visibility tier
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {OPPORTUNITY_PROMOTION_TIERS.map((promotionTier) => {
                const active = form.promotionTier === promotionTier;
                const featured = promotionTier === "featured";
                return (
                  <button
                    key={promotionTier}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({ ...current, promotionTier }))
                    }
                    className={`rounded-[1.35rem] border px-4 py-4 text-left transition-all ${
                      active
                        ? "border-brand-500/40 bg-brand-500/10 text-text-primary"
                        : "border-border/60 bg-surface/70 text-text-secondary hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-inherit">
                        {OPPORTUNITY_PROMOTION_TIER_LABELS[promotionTier]}
                      </p>
                      <span className="text-sm font-semibold text-brand-500">
                        {featured ? formatPrice(listingFeeCents) : "Free"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-text-tertiary">
                      {featured
                        ? "90 days. Higher placement after payment."
                        : "30 days. Login required. One active free listing."}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">Title</span>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className={FIELD_CLASS}
              placeholder="Launch trailer for AI product campaign"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              Company or client
            </span>
            <input
              value={form.companyName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  companyName: event.target.value,
                }))
              }
              className={FIELD_CLASS}
              placeholder="Northline Labs"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              Company type
            </span>
            <select
              value={form.companyType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  companyType: event.target.value,
                }))
              }
              className={FIELD_CLASS}
            >
              {OPPORTUNITY_COMPANY_TYPES.map((companyType) => (
                <option key={companyType} value={companyType} className="bg-surface text-text-primary">
                  {OPPORTUNITY_COMPANY_TYPE_LABELS[companyType]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              Work type
            </span>
            <select
              value={form.workType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  workType: event.target.value,
                }))
              }
              className={FIELD_CLASS}
            >
              {OPPORTUNITY_WORK_TYPES.map((workType) => (
                <option key={workType} value={workType} className="bg-surface text-text-primary">
                  {OPPORTUNITY_WORK_TYPE_LABELS[workType]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-text-primary">Summary</span>
          <input
            value={form.summary}
            onChange={(event) =>
              setForm((current) => ({ ...current, summary: event.target.value }))
            }
            className={FIELD_CLASS}
            placeholder="Sharp launch trailer plus social-ready trims."
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-text-primary">
            Full description
          </span>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={8}
            className={TEXTAREA_CLASS}
            placeholder="Describe the scope, deliverables, timeline, and what a strong candidate should already know."
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              {isServiceOffer ? "Starting price (USD)" : "Budget minimum (USD)"}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.budgetMinDollars}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  budgetMinDollars: event.target.value,
                }))
              }
              className={FIELD_CLASS}
              placeholder="4000"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              {isServiceOffer ? "Price ceiling (USD)" : "Budget maximum (USD)"}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.budgetMaxDollars}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  budgetMaxDollars: event.target.value,
                }))
              }
              className={FIELD_CLASS}
              placeholder="8000"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              Timeline
            </span>
            <input
              value={form.timelineText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timelineText: event.target.value,
                }))
              }
              className={FIELD_CLASS}
              placeholder="2 weeks"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              Location or remote
            </span>
            <input
              value={form.locationText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  locationText: event.target.value,
                }))
              }
              className={FIELD_CLASS}
              placeholder="Remote"
              required
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-text-primary">
            Service tags
          </span>
          <input
            value={form.serviceTags}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                serviceTags: event.target.value,
              }))
            }
            className={FIELD_CLASS}
            placeholder="Ads, Film, Music Video"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              Apply URL
            </span>
            <input
              value={form.applyUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  applyUrl: event.target.value,
                }))
              }
              className={FIELD_CLASS}
              placeholder="https://..."
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">
              Contact email
            </span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  contactEmail: event.target.value,
                }))
              }
              className={FIELD_CLASS}
              placeholder="jobs@company.com"
            />
          </label>
        </div>

        <div className="rounded-[1.5rem] border border-border/60 bg-surface/70 px-4 py-4 text-sm leading-6 text-text-secondary">
          Use exactly one contact target. Add a link or an email, not both.
          {isFeatured
            ? ` Featured listings cost ${formatPrice(
                listingFeeCents
              )}, stay live for 90 days, and rank above free posts after review.`
            : " Free listings stay live for 30 days and are limited to one active free post per account."}
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="press-effect inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitLabel}
          </button>
          <Link
            href="/opportunities/mine"
            className="press-effect inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/85 px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface"
          >
            My listings
          </Link>
        </div>
      </form>
    </section>
  );
}
