"use client";

import { forwardRef, useState } from "react";
import type { FeedConceptCard } from "@/components/projects/types";
import { getCardMediaUrl } from "@/components/projects/utils";
import { CardDetailOverlay } from "@/components/ui/card-detail-overlay";

interface FeedSlideConceptProps {
  card: FeedConceptCard;
}

export const FeedSlideConcept = forwardRef<HTMLVideoElement, FeedSlideConceptProps>(
  function FeedSlideConcept({ card }, ref) {
    const mediaUrl = getCardMediaUrl(card.media_asset_id, card.media_type);
    const [overlayOpen, setOverlayOpen] = useState(false);

    return (
      <div className="relative h-full w-full">
        {/* Media */}
        {card.media_type === "video" && mediaUrl ? (
          <video
            ref={ref}
            src={mediaUrl}
            loop
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : mediaUrl ? (
          <img
            src={mediaUrl}
            alt={card.caption ?? "Concept art"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-black" />
        )}

        {/* Dark gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Caption — tap to open overlay */}
        {card.caption ? (
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            className="absolute bottom-[220px] left-0 right-0 px-4 text-left"
          >
            <p className="text-base leading-snug text-white/90 line-clamp-2">{card.caption}</p>
            <span className="mt-1 inline-block text-xs text-white/50">Tap to read more</span>
          </button>
        ) : null}

        <CardDetailOverlay
          open={overlayOpen}
          onClose={() => setOverlayOpen(false)}
          mediaUrl={mediaUrl}
          mediaType={card.media_type as "image" | "video"}
          title={null}
          description={card.caption}
        />
      </div>
    );
  }
);
