"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface PresenceContextValue {
  globalOnlineCount: number;
  videoWatchers: Record<string, number>;
}

const PresenceContext = createContext<PresenceContextValue>({
  globalOnlineCount: 0,
  videoWatchers: {},
});

const SESSION_STORAGE_KEY = "myriad_presence_session";

function getPresenceSessionId(): string {
  if (typeof window === "undefined") return "server";

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const next = `presence-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
  return next;
}

function countPresenceEntries(state: Record<string, unknown>): number {
  return Object.values(state).reduce<number>((total, entries) => {
    if (!Array.isArray(entries)) return total;
    return total + entries.length;
  }, 0);
}

function mapVideoWatchers(state: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const entries of Object.values(state)) {
    if (!Array.isArray(entries)) continue;

    for (const entry of entries as Array<{ video_id?: unknown }>) {
      const videoId =
        typeof entry.video_id === "string" && entry.video_id.trim()
          ? entry.video_id
          : null;

      if (!videoId) continue;
      counts[videoId] = (counts[videoId] ?? 0) + 1;
    }
  }

  return counts;
}

function getWatchVideoId(pathname: string): string | null {
  const match = pathname.match(/^\/watch\/([^/]+)$/);
  return match ? match[1] : null;
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const sessionIdRef = useRef<string>("");
  const globalChannelRef = useRef<RealtimeChannel | null>(null);
  const videoChannelRef = useRef<RealtimeChannel | null>(null);
  const [globalOnlineCount, setGlobalOnlineCount] = useState(0);
  const [videoWatchers, setVideoWatchers] = useState<Record<string, number>>({});
  const [globalReady, setGlobalReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    sessionIdRef.current = getPresenceSessionId();
    const initialPathname = window.location.pathname;

    const globalChannel = supabase.channel("myriad:global", {
      config: { presence: { key: sessionIdRef.current } },
    });

    globalChannel
      .on("presence", { event: "sync" }, () => {
        const state = globalChannel.presenceState();
        setGlobalOnlineCount(countPresenceEntries(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setGlobalReady(true);
          await globalChannel.track({
            session_id: sessionIdRef.current,
            path: initialPathname,
            at: Date.now(),
          });
        }
      });

    const videoChannel = supabase.channel("myriad:video-presence", {
      config: { presence: { key: sessionIdRef.current } },
    });

    videoChannel
      .on("presence", { event: "sync" }, () => {
        const state = videoChannel.presenceState();
        setVideoWatchers(mapVideoWatchers(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setVideoReady(true);
          await videoChannel.track({
            session_id: sessionIdRef.current,
            video_id: getWatchVideoId(initialPathname),
            path: initialPathname,
            at: Date.now(),
          });
        }
      });

    globalChannelRef.current = globalChannel;
    videoChannelRef.current = videoChannel;

    return () => {
      globalChannelRef.current = null;
      videoChannelRef.current = null;
      globalChannel.untrack().catch(() => {});
      videoChannel.untrack().catch(() => {});
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(videoChannel);
    };
  }, []);

  useEffect(() => {
    const globalChannel = globalChannelRef.current;
    if (!globalChannel || !globalReady) return;

    globalChannel
      .track({
        session_id: sessionIdRef.current,
        path: pathname,
        at: Date.now(),
      })
      .catch(() => {});
  }, [pathname, globalReady]);

  useEffect(() => {
    const videoChannel = videoChannelRef.current;
    if (!videoChannel || !videoReady) return;

    videoChannel
      .track({
        session_id: sessionIdRef.current,
        video_id: getWatchVideoId(pathname),
        path: pathname,
        at: Date.now(),
      })
      .catch(() => {});
  }, [pathname, videoReady]);

  const value = useMemo(
    () => ({
      globalOnlineCount,
      videoWatchers,
    }),
    [globalOnlineCount, videoWatchers]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return useContext(PresenceContext);
}
