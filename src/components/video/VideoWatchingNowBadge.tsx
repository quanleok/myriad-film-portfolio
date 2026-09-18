"use client";

import { usePresence } from "@/contexts/PresenceContext";

export function VideoWatchingNowBadge({ videoId }: { videoId: string }) {
  const { videoWatchers } = usePresence();
  const watchingCount = videoWatchers[videoId] ?? 0;

  if (watchingCount < 5) {
    return null;
  }

  return (
    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
      🟢 {watchingCount} watching
    </span>
  );
}

