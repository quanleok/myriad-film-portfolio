"use client";

import { forwardRef, useCallback, useRef } from "react";
import { TeaserPlayer, type TeaserPlayerHandle } from "@/components/projects/teaser-player";
import { getProjectTeaserUrl } from "@/components/projects/utils";

interface FeedSlideTeaserProps {
  teaserAssetId: string | null;
  thumbnailUrl: string | null;
  title: string;
  muted: boolean;
  onToggleMute: () => void;
}

export const FeedSlideTeaser = forwardRef<HTMLVideoElement, FeedSlideTeaserProps>(
  function FeedSlideTeaser({ teaserAssetId, thumbnailUrl, title, muted, onToggleMute }, ref) {
    const videoUrl = getProjectTeaserUrl(teaserAssetId);
    const playerRef = useRef<TeaserPlayerHandle>(null);

    // Expose the underlying video element via the forwarded ref
    const setRef = useCallback(
      (handle: TeaserPlayerHandle | null) => {
        (playerRef as React.MutableRefObject<TeaserPlayerHandle | null>).current = handle;
        if (typeof ref === "function") {
          ref(handle?.getVideo() ?? null);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLVideoElement | null>).current =
            handle?.getVideo() ?? null;
        }
      },
      [ref]
    );

    return (
      <TeaserPlayer
        ref={setRef}
        src={videoUrl}
        poster={thumbnailUrl}
        fit="cover"
        defaultMuted={muted}
        onMutedChange={(m) => {
          if (m !== muted) onToggleMute();
        }}
      />
    );
  }
);
