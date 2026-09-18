"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { EmbedPaywallOverlay } from "./EmbedPaywallOverlay";

interface EmbedPlayerProps {
  videoUrl: string;
  title: string;
  autoplay?: boolean;
  muted?: boolean;
  isPremium?: boolean;
  previewSeconds?: number;
  creatorName?: string;
  watchUrl?: string;
}

export function EmbedPlayer({
  videoUrl,
  title,
  autoplay = false,
  muted = false,
  isPremium = false,
  previewSeconds = 10,
  creatorName = "this creator",
  watchUrl = "",
}: EmbedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isPremium) return;

    if (video.currentTime >= previewSeconds) {
      video.pause();
      setShowPaywall(true);
    }
  }, [isPremium, previewSeconds]);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        autoPlay={autoplay}
        muted={muted}
        title={title}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* "Watch on Myriad Spring" watermark */}
      {watchUrl && (
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-10 right-3 z-10 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white/70 hover:text-white transition-colors"
        >
          Watch on Myriad Spring
        </a>
      )}

      {showPaywall && (
        <EmbedPaywallOverlay
          creatorName={creatorName}
          watchUrl={watchUrl}
        />
      )}
    </div>
  );
}
