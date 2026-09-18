"use client";

import { useEffect, useRef } from "react";
import { useMiniPlayer } from "@/contexts/MiniPlayerContext";

interface MiniPlayerActivatorProps {
  videoId: string;
  title: string;
  creatorName: string;
  thumbnailUrl: string | null;
  streamUrl: string | null;
}

/**
 * Invisible component that activates the mini player when the user
 * navigates away from a watch page (component unmounts).
 *
 * Continuously tracks the video's currentTime in a ref so it's
 * available even after the DOM element is removed during unmount.
 */
export function MiniPlayerActivator({
  videoId,
  title,
  creatorName,
  thumbnailUrl,
  streamUrl,
}: MiniPlayerActivatorProps) {
  const { activate, deactivate, miniPlayer } = useMiniPlayer();
  const activateRef = useRef(activate);
  const dataRef = useRef({ videoId, title, creatorName, thumbnailUrl, streamUrl });
  const timeRef = useRef(0);
  const durationRef = useRef(0);

  function getWatchVideoElement(): HTMLVideoElement | null {
    if (typeof document === "undefined") return null;
    return (
      document.querySelector(`video[data-video-id="${videoId}"]`) ??
      document.querySelector("video")
    ) as HTMLVideoElement | null;
  }

  // Keep refs up to date
  activateRef.current = activate;
  dataRef.current = { videoId, title, creatorName, thumbnailUrl, streamUrl };

  // When arriving at a watch page that the mini player is playing,
  // deactivate the mini player (the main player takes over)
  useEffect(() => {
    if (miniPlayer?.videoId === videoId) {
      deactivate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Continuously track the video element's currentTime in a ref
  useEffect(() => {
    function onTimeUpdate() {
      const video = getWatchVideoElement();
      if (video) {
        timeRef.current = video.currentTime;
        durationRef.current = video.duration || 0;
      }
    }

    // Poll via timeupdate events on the video element
    const video = getWatchVideoElement();
    if (video) {
      video.addEventListener("timeupdate", onTimeUpdate);
      // Grab initial values
      timeRef.current = video.currentTime;
      durationRef.current = video.duration || 0;
    }

    // Also poll in case the video element appears later
    const interval = setInterval(() => {
      const v = getWatchVideoElement();
      if (v) {
        timeRef.current = v.currentTime;
        durationRef.current = v.duration || 0;
        // Attach listener if not already
        v.removeEventListener("timeupdate", onTimeUpdate);
        v.addEventListener("timeupdate", onTimeUpdate);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      const v = getWatchVideoElement();
      v?.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoId]);

  // On unmount (navigation away), activate the mini player using stored time
  useEffect(() => {
    return () => {
      const d = dataRef.current;
      if (!d.streamUrl) return;

      const currentTime = timeRef.current;
      const duration = durationRef.current;

      // Don't activate if video hasn't started or is near the end
      if (currentTime < 1) return;
      if (duration > 0 && currentTime / duration > 0.95) return;

      activateRef.current({
        videoId: d.videoId,
        title: d.title,
        creatorName: d.creatorName,
        thumbnailUrl: d.thumbnailUrl,
        streamUrl: d.streamUrl,
        currentTime,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
