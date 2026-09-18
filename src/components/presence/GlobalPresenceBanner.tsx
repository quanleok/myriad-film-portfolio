"use client";

import { usePresence } from "@/contexts/PresenceContext";

export function GlobalPresenceBanner() {
  const { globalOnlineCount } = usePresence();

  if (globalOnlineCount < 10) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary">
      🟢 {globalOnlineCount.toLocaleString()} people browsing Myriad right now
    </div>
  );
}

