"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Hook for VideoPlayer integration.
 *
 * Usage in VideoPlayer:
 *   const { savePosition, getInitialPosition } = useWatchHistory(videoId);
 *
 *   // On mount: seek to getInitialPosition()
 *   // Every 30s during playback: savePosition(currentTimeInSeconds)
 */
export function useWatchHistory(videoId: string) {
  const lastSaved = useRef(0);
  const initialPosition = useRef<number | null>(null);
  const fetched = useRef(false);

  // Fetch initial position on mount
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch(`/api/watch-history`)
      .then((r) => r.json())
      .then((json) => {
        const entry = (json.data ?? []).find(
          (e: any) => e.videos?.id === videoId
        );
        if (entry) {
          initialPosition.current = entry.last_position_seconds;
        }
      })
      .catch(() => {});
  }, [videoId]);

  const savePosition = useCallback(
    (positionSeconds: number) => {
      const now = Date.now();
      // Throttle: save at most every 30 seconds
      if (now - lastSaved.current < 30000) return;
      lastSaved.current = now;

      fetch("/api/watch-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          positionSeconds: Math.floor(positionSeconds),
        }),
      }).catch(() => {});
    },
    [videoId]
  );

  const getInitialPosition = useCallback(() => {
    return initialPosition.current ?? 0;
  }, []);

  return { savePosition, getInitialPosition };
}
