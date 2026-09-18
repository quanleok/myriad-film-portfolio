"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NextEpisodeOverlayProps {
  nextEpisode: {
    id: string;
    title: string;
    episodeNumber: number;
    thumbnailUrl: string | null;
    isPremium: boolean;
  };
  seriesTitle: string;
  isSubscribed: boolean;
  subscriptionPriceCents: number;
  creatorUsername: string;
  visible: boolean;
}

export function NextEpisodeOverlay({
  nextEpisode,
  seriesTitle,
  isSubscribed,
  subscriptionPriceCents,
  creatorUsername,
  visible,
}: NextEpisodeOverlayProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);

  const needsPaywall = nextEpisode.isPremium && !isSubscribed;

  useEffect(() => {
    if (!visible || cancelled || needsPaywall) return;

    setCountdown(10);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push(`/watch/${nextEpisode.id}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, cancelled, needsPaywall, nextEpisode.id, router]);

  const handleCancel = useCallback(() => {
    setCancelled(true);
  }, []);

  if (!visible) return null;

  // Circular progress ring
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = ((10 - countdown) / 10) * circumference;

  if (needsPaywall) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-20">
        <div className="max-w-md text-center space-y-4 p-6">
          <p className="text-xs uppercase tracking-wider text-text-secondary">
            Up Next — Episode {nextEpisode.episodeNumber}
          </p>
          <p className="text-xl font-bold text-white">{nextEpisode.title}</p>
          <p className="text-sm text-text-secondary">
            Subscribe to continue watching {seriesTitle}
          </p>
          <Link
            href={`/creator/${creatorUsername}`}
            className="inline-flex items-center rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-page hover:opacity-80 transition-colors"
          >
            Subscribe — ${(subscriptionPriceCents / 100).toFixed(2)}/mo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-20">
      <div className="max-w-md text-center space-y-4 p-6">
        <p className="text-xs uppercase tracking-wider text-text-secondary">
          Up Next — Episode {nextEpisode.episodeNumber}
        </p>

        {/* Thumbnail */}
        {nextEpisode.thumbnailUrl && (
          <div className="mx-auto w-64 overflow-hidden rounded-lg">
            <img
              src={nextEpisode.thumbnailUrl}
              alt={nextEpisode.title}
              className="aspect-video w-full object-cover"
            />
          </div>
        )}

        <p className="text-lg font-bold text-white">{nextEpisode.title}</p>

        {!cancelled ? (
          <>
            {/* Countdown ring */}
            <div className="flex justify-center">
              <div className="relative">
                <svg width="60" height="60" className="-rotate-90">
                  <circle
                    cx="30"
                    cy="30"
                    r={radius}
                    stroke="#333"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {countdown}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Link
                href={`/watch/${nextEpisode.id}`}
                className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-page hover:opacity-80 transition-colors"
              >
                Play Now
              </Link>
              <button
                onClick={handleCancel}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <Link
            href={`/watch/${nextEpisode.id}`}
            className="inline-flex items-center rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-page hover:opacity-80 transition-colors"
          >
            Play Episode {nextEpisode.episodeNumber}
          </Link>
        )}
      </div>
    </div>
  );
}
