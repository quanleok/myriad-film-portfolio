"use client";

import { useState, useCallback } from "react";
import { WatchPlayer } from "@/components/video/WatchPlayer";
import { NextEpisodeOverlay } from "@/components/video/NextEpisodeOverlay";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { FloatingReactionsOverlay } from "@/components/video/FloatingReactionsOverlay";

interface WatchPlayerSectionProps {
  videoId: string;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  previewSeconds: number;
  pricingModel: string;
  priceCents: number;
  creatorId: string;
  subscriptionPriceCents: number;
  creatorName?: string;
  creatorUsername?: string;
  durationSeconds?: number;
  initialPosition?: number;
  autoCheckout?: "purchase" | "subscribe";
  nextEpisode?: {
    id: string;
    title: string;
    episodeNumber: number;
    thumbnailUrl: string | null;
    isPremium: boolean;
  } | null;
  seriesTitle: string;
  isSubscribed: boolean;
}

export function WatchPlayerSection({
  videoId,
  streamUrl,
  thumbnailUrl,
  previewSeconds,
  pricingModel,
  priceCents,
  creatorId,
  subscriptionPriceCents,
  creatorName,
  creatorUsername,
  durationSeconds,
  initialPosition,
  autoCheckout,
  nextEpisode,
  seriesTitle,
  isSubscribed,
}: WatchPlayerSectionProps) {
  const [videoEnded, setVideoEnded] = useState(false);

  const handleEnded = useCallback(() => {
    setVideoEnded(true);
  }, []);

  return (
    <div className="relative">
      <WatchPlayer
        videoId={videoId}
        streamUrl={streamUrl}
        thumbnailUrl={thumbnailUrl}
        previewSeconds={previewSeconds}
        pricingModel={pricingModel}
        priceCents={priceCents}
        creatorId={creatorId}
        subscriptionPriceCents={subscriptionPriceCents}
        creatorName={creatorName}
        creatorUsername={creatorUsername}
        durationSeconds={durationSeconds}
        initialPosition={initialPosition}
        autoCheckout={autoCheckout}
        onEnded={nextEpisode ? handleEnded : undefined}
      />
      <ErrorBoundary>
        <FloatingReactionsOverlay />
      </ErrorBoundary>
      {nextEpisode && (
        <NextEpisodeOverlay
          nextEpisode={nextEpisode}
          seriesTitle={seriesTitle}
          isSubscribed={isSubscribed}
          subscriptionPriceCents={subscriptionPriceCents}
          creatorUsername={creatorUsername ?? ""}
          visible={videoEnded}
        />
      )}
    </div>
  );
}
