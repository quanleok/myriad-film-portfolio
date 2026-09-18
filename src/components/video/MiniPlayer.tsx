"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Hls from "hls.js";
import { useMiniPlayer } from "@/contexts/MiniPlayerContext";

export function MiniPlayer() {
  const { miniPlayer, deactivate, updateTime } = useMiniPlayer();
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Hide mini player when user navigates to the same video's watch page
  const isOnWatchPage = miniPlayer && pathname === `/watch/${miniPlayer.videoId}`;
  const shouldShow = miniPlayer && !isOnWatchPage;

  // Setup HLS streaming — use callback ref to ensure video element exists
  const setupHls = useCallback(
    (video: HTMLVideoElement | null) => {
      // Destroy previous instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (!video || !miniPlayer) return;

      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 10 });
        hlsRef.current = hls;
        hls.loadSource(miniPlayer.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.currentTime = miniPlayer.currentTime;
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              deactivate();
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = miniPlayer.streamUrl;
        video.currentTime = miniPlayer.currentTime;
        video.play().catch(() => {});
      }
    },
    [miniPlayer?.videoId, miniPlayer?.streamUrl]
  );

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, []);

  // Track time updates
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) updateTime(video.currentTime);
  }, [updateTime]);

  // Combined ref callback: stores ref + sets up HLS
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      setupHls(node);
    },
    [setupHls]
  );

  if (!shouldShow) return null;

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[35] flex w-[calc(100vw-2rem)] max-w-[360px] sm:w-[360px] overflow-hidden rounded-xl border border-border bg-page shadow-2xl animate-slide-up">
      {/* Video */}
      <div className="relative w-[160px] shrink-0 bg-black">
        <div className="aspect-video">
          <video
            ref={setVideoRef}
            className="h-full w-full object-cover"
            playsInline
            muted={false}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      </div>

      {/* Info + controls */}
      <div className="flex flex-1 flex-col justify-between p-2.5 min-w-0">
        <div className="min-w-0">
          <Link
            href={`/watch/${miniPlayer.videoId}`}
            className="text-[13px] font-medium text-text-primary line-clamp-2 leading-tight hover:text-brand-400 transition-colors"
          >
            {miniPlayer.title}
          </Link>
          <p className="mt-0.5 text-[11px] text-text-tertiary truncate">
            {miniPlayer.creatorName}
          </p>
        </div>

        <div className="flex items-center gap-1 mt-1">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-primary">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-primary ml-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Expand — go to watch page */}
          <Link
            href={`/watch/${miniPlayer.videoId}`}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover transition-colors"
            aria-label="Expand"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </Link>

          {/* Close */}
          <button
            type="button"
            onClick={deactivate}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-hover transition-colors"
            aria-label="Close mini player"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
