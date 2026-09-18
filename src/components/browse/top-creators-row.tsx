"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { formatCount } from "@/lib/utils";


export interface TopCreatorCardData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  follower_count: number;
  subscriber_count: number;
  total_views: number;
  star_level: number;
  genre_interests: string[];
}

interface TopCreatorsRowProps {
  creators: TopCreatorCardData[];
}

export function TopCreatorsRow({ creators }: TopCreatorsRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Slow auto-scroll
  useEffect(() => {
    if (isPaused) return;

    let rafId: number;
    let lastTime = 0;
    const speed = 20; // pixels per second — slow drift

    function step(timestamp: number) {
      const el = scrollRef.current;
      if (!el) { rafId = requestAnimationFrame(step); return; }

      if (lastTime === 0) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      // Content is duplicated. Reset at half of total scrollWidth for seamless loop.
      const halfWidth = el.scrollWidth / 2;
      if (halfWidth <= 0) { rafId = requestAnimationFrame(step); return; }

      el.scrollLeft += (speed * delta) / 1000;
      if (el.scrollLeft >= halfWidth) {
        el.scrollLeft -= halfWidth;
      }

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused]);

  const [isHovered, setIsHovered] = useState(false);

  if (creators.length === 0) return null;

  return (
    <section
      className="relative"
      onMouseEnter={() => { setIsPaused(true); setIsHovered(true); }}
      onMouseLeave={() => { setIsPaused(false); setIsHovered(false); }}
    >
      {/* Hover dark overlay */}
      <div className={`absolute -inset-x-8 -inset-y-4 rounded-2xl transition-all duration-200 pointer-events-none ${
        isHovered ? "bg-text-primary/[0.05]" : "bg-transparent"
      }`} />

      <div className="relative z-[1] mb-4 flex items-center justify-between">
        <Link
          href="/browse?tab=creators"
          className="inline-flex items-center gap-2 font-display text-lg font-semibold text-text-primary rounded-lg px-2 py-1 -mx-2 transition-colors duration-200 hover:bg-surface-active"
        >
          <Users size={18} className="text-text-secondary" />
          Top Creators
          <svg className="h-4 w-4 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link href="/browse?tab=creators" className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200">
          See all &rarr;
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="relative scrollbar-hide -mx-4 flex gap-5 overflow-x-auto px-4 pb-2"
      >
        {/* Original + clone for seamless infinite scroll */}
        {[...creators, ...creators].map((creator, i) => (
          <Link
            key={`${creator.id}-${i}`}
            href={`/creator/${creator.username}`}
            className="group flex shrink-0 flex-col items-center gap-2.5 w-[120px] sm:w-[140px] lg:w-[150px]"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] lg:h-[130px] lg:w-[130px] rounded-lg border-2 border-border bg-surface overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:border-text-primary/30 group-hover:shadow-lg">
                {creator.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt={creator.display_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-active text-2xl font-semibold text-text-secondary">
                    {creator.display_name[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
            </div>

            {/* Name + stats */}
            <div className="text-center min-w-0 w-full">
              <p className="text-xs font-semibold text-text-primary truncate leading-tight">
                {creator.display_name}
              </p>
              <p className="text-[10px] text-text-tertiary mt-0.5 leading-tight">
                {formatCount(creator.follower_count)} followers
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
