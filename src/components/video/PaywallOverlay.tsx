"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface PaywallOverlayProps {
  priceCents: number;
  subscriptionPriceCents: number;
  onPurchase: () => Promise<string | null>;
  onSubscribe: () => Promise<string | null>;
  creatorName?: string;
  creatorUsername?: string;
  durationSeconds?: number;
}

export function PaywallOverlay({
  priceCents,
  subscriptionPriceCents,
  onPurchase,
  onSubscribe,
  creatorName,
  creatorUsername,
  durationSeconds,
}: PaywallOverlayProps) {
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = creatorName ?? "this creator";
  const subscribeOnly = subscriptionPriceCents > 0 && priceCents <= 0;

  const durationLabel = durationSeconds
    ? durationSeconds >= 3600
      ? `${Math.floor(durationSeconds / 3600)} hr ${Math.floor((durationSeconds % 3600) / 60)} min`
      : `${Math.floor(durationSeconds / 60)} min`
    : null;

  async function handlePurchaseClick() {
    setPurchaseLoading(true);
    setError(null);
    const err = await onPurchase();
    if (err) {
      setError(err);
      setPurchaseLoading(false);
    }
  }

  async function handleSubscribeClick() {
    setSubscribeLoading(true);
    setError(null);
    const err = await onSubscribe();
    if (err) {
      setError(err);
      setSubscribeLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="mx-4 w-full sm:max-w-sm rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/10 p-6 text-center space-y-4 shadow-2xl"
      >
        {/* Lock icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
          <svg className="h-6 w-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div>
          <h3 id="paywall-title" className="text-lg font-bold text-white">
            Premium Content
          </h3>
          <p className="mt-1 text-sm text-neutral-400">
            Support {displayName} to unlock this video
          </p>
          {durationLabel && (
            <p className="mt-1 text-xs text-neutral-500">
              Full video: {durationLabel}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          {priceCents > 0 && (
            <button
              type="button"
              className="w-full rounded-xl bg-white text-black font-semibold py-3 px-4 text-sm transition-all hover:bg-neutral-200 disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={handlePurchaseClick}
              disabled={purchaseLoading || subscribeLoading}
            >
              {purchaseLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Processing...
                </>
              ) : (
                <>Unlock — {formatPrice(priceCents)}</>
              )}
            </button>
          )}
          {priceCents > 0 && subscriptionPriceCents > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-neutral-500">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          )}
          {subscriptionPriceCents > 0 && (
            <div className="space-y-1.5">
              <button
                type="button"
                className={`w-full rounded-xl font-semibold py-3 px-4 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  subscribeOnly
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                onClick={handleSubscribeClick}
                disabled={purchaseLoading || subscribeLoading}
              >
                {subscribeLoading ? (
                  <>
                    <span className={`h-4 w-4 animate-spin rounded-full border-2 ${
                      subscribeOnly
                        ? "border-black/30 border-t-black"
                        : "border-white/30 border-t-white"
                    }`} />
                    Processing...
                  </>
                ) : (
                  <>Subscribe — {formatPrice(subscriptionPriceCents)}/mo</>
                )}
              </button>
              <p className="text-xs text-neutral-500">
                Access all of {displayName}&apos;s premium content
              </p>
            </div>
          )}
        </div>

        {creatorUsername && (
          <Link
            href={`/creator/${creatorUsername}`}
            className="inline-block text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Visit {displayName}&apos;s profile
          </Link>
        )}
      </div>
    </div>
  );
}
