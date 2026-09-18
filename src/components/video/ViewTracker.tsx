"use client";

import { useEffect, useRef } from "react";

export function ViewTracker({ videoId }: { videoId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // Fire view after 3 seconds of watch time
    const timer = setTimeout(() => {
      fetch("/api/video/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      }).catch(() => {});
    }, 3000);

    return () => clearTimeout(timer);
  }, [videoId]);

  return null;
}
