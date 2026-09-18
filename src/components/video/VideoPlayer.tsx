"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  videoUrl: string;
  videoId?: string;
  posterUrl?: string;
  previewSeconds?: number;
  hasAccess: boolean;
  onPreviewEnd?: () => void;
  onEnded?: () => void;
  initialPosition?: number;
  onVideoElement?: (el: HTMLVideoElement | null) => void;
}

export function VideoPlayer({
  videoUrl,
  videoId,
  posterUrl,
  previewSeconds = 180,
  hasAccess,
  onPreviewEnd,
  onEnded,
  initialPosition,
  onVideoElement,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastSavedRef = useRef(0);
  const hasSeekedRef = useRef(false);
  const hasAccessRef = useRef(hasAccess);
  hasAccessRef.current = hasAccess;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const networkRetryCountRef = useRef(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hlsError, setHlsError] = useState(false);

  // Reset buffering/seek state when source changes.
  useEffect(() => {
    hasSeekedRef.current = false;
    setIsBuffering(true);
  }, [videoUrl]);

  // Save progress to API (uses ref to avoid stale closure with hasAccess)
  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !videoId || !hasAccessRef.current) return;
    const pos = Math.floor(video.currentTime);
    const dur = Math.floor(video.duration || 0);
    if (!Number.isFinite(pos) || !Number.isFinite(dur) || pos < 0 || dur <= 0) return;
    if (pos < 5 || pos === lastSavedRef.current) return;
    lastSavedRef.current = pos;

    const data = JSON.stringify({
      videoId,
      positionSeconds: pos,
      durationSeconds: dur,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/watch-history",
        new Blob([data], { type: "application/json" })
      );
    } else {
      fetch("/api/watch-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  }, [videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    setHlsError(false);

    const MAX_NETWORK_RETRIES = 3;
    networkRetryCountRef.current = 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        startLevel: -1,
        capLevelToPlayerSize: true,
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCountRef.current < MAX_NETWORK_RETRIES) {
                networkRetryCountRef.current++;
                hls.startLoad();
              } else {
                setHlsError(true);
                hls.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setHlsError(true);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl]);

  // Expose the mounted video element and clear on unmount.
  useEffect(() => {
    onVideoElement?.(videoRef.current);
    return () => onVideoElement?.(null);
  }, [onVideoElement]);

  // Auto-seek to saved position once video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !initialPosition || initialPosition <= 0 || !hasAccess) return;

    const seekTo = initialPosition ?? 0;

    function onLoadedMetadata() {
      if (!hasSeekedRef.current && video && seekTo > 0) {
        video.currentTime = seekTo;
        hasSeekedRef.current = true;
      }
    }

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    if (video.readyState >= 1 && !hasSeekedRef.current && seekTo > 0) {
      video.currentTime = seekTo;
      hasSeekedRef.current = true;
    }

    return () => video.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, [initialPosition, hasAccess]);

  // Periodic save every 30 seconds
  useEffect(() => {
    if (!videoId || !hasAccess) return;

    const interval = window.setInterval(saveProgress, 30000);
    return () => window.clearInterval(interval);
  }, [videoId, hasAccess, saveProgress]);

  // Save on page unload and video pause
  useEffect(() => {
    if (!videoId || !hasAccess) return;
    const video = videoRef.current;

    function handleBeforeUnload() {
      saveProgress();
    }

    function handlePause() {
      saveProgress();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    video?.addEventListener("pause", handlePause);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      video?.removeEventListener("pause", handlePause);
      saveProgress();
    };
  }, [videoId, hasAccess, saveProgress]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasAccess) return;

    if (video.currentTime >= previewSeconds) {
      video.pause();
      video.currentTime = previewSeconds;
      onPreviewEnd?.();
    }
  }, [hasAccess, previewSeconds, onPreviewEnd]);

  return (
    <div className="relative aspect-video w-full max-h-[80vh] overflow-hidden bg-black">
      {/* HLS fatal error overlay */}
      {hlsError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80">
          <p className="text-sm text-text-secondary">Video failed to load</p>
          <button
            type="button"
            onClick={() => {
              setHlsError(false);
              networkRetryCountRef.current = 0;
              const video = videoRef.current;
              if (video && videoUrl) {
                hlsRef.current?.destroy();
                const hls = new Hls({ maxBufferLength: 15, maxMaxBufferLength: 30, startLevel: -1, capLevelToPlayerSize: true, manifestLoadingTimeOut: 15000, levelLoadingTimeOut: 15000, fragLoadingTimeOut: 20000 });
                hlsRef.current = hls;
                hls.loadSource(videoUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.ERROR, (_event, data) => {
                  if (data.fatal) { setHlsError(true); hls.destroy(); }
                });
              }
            }}
            className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Poster thumbnail — shown while buffering */}
      {posterUrl && isBuffering && (
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      <video
        ref={videoRef}
        data-video-id={videoId ?? undefined}
        className="absolute inset-0 h-full w-full"
        controls
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          saveProgress();
          onEndedRef.current?.();
        }}
      />
    </div>
  );
}
