"use client";

import { useRef, useState, useEffect, useId, type ReactNode } from "react";
import Link from "next/link";
import { VideoCard } from "@/components/video/video-card";
import type { VideoWithCreator } from "@/types/video";

// ── Global coordinator: only the row closest to viewport center auto-scrolls ──
const rowRegistry = new Map<string, HTMLElement>();
let activeRowId: string | null = null;
const listeners = new Set<() => void>();

function recalcActive() {
  const viewportCenter = window.innerHeight / 2;
  let closest: string | null = null;
  let closestDist = Infinity;

  rowRegistry.forEach((el, id) => {
    const rect = el.getBoundingClientRect();
    // Only consider rows that are at least partially visible
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const rowCenter = rect.top + rect.height / 2;
    const dist = Math.abs(rowCenter - viewportCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closest = id;
    }
  });

  if (closest !== activeRowId) {
    activeRowId = closest;
    listeners.forEach((fn) => fn());
  }
}

let scrollListenerAttached = false;
function ensureGlobalListener() {
  if (scrollListenerAttached) return;
  scrollListenerAttached = true;
  window.addEventListener("scroll", recalcActive, { passive: true });
  window.addEventListener("resize", recalcActive, { passive: true });
}

function registerRow(id: string, el: HTMLElement) {
  rowRegistry.set(id, el);
  ensureGlobalListener();
  recalcActive();
}

function unregisterRow(id: string) {
  rowRegistry.delete(id);
  recalcActive();
}

function useIsActiveRow(id: string): boolean {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const check = () => setIsActive(activeRowId === id);
    listeners.add(check);
    check(); // initial
    return () => { listeners.delete(check); };
  }, [id]);

  return isActive;
}

// ── ContentRow ──
interface ContentRowProps {
  title: string;
  icon?: ReactNode;
  videos: VideoWithCreator[];
  seeAllHref?: string;
  /** Pass progress map for "Continue Watching" row (videoId -> percentage) */
  progressMap?: Record<string, number>;
}

export function ContentRow({ title, icon, videos, seeAllHref, progressMap }: ContentRowProps) {
  const rowId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const isActive = useIsActiveRow(rowId);

  // Register/unregister with global coordinator
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    registerRow(rowId, el);
    return () => unregisterRow(rowId);
  }, [rowId]);

  // Smooth auto-scroll — seamless infinite loop (content is duplicated in DOM)
  useEffect(() => {
    if (!isActive || isPaused) return;

    let rafId: number;
    let lastTime = 0;
    const speed = 30; // pixels per second

    function step(timestamp: number) {
      const el = scrollRef.current;
      if (!el) { rafId = requestAnimationFrame(step); return; }

      if (lastTime === 0) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      // Content is duplicated. Reset at half of total scrollWidth for seamless loop.
      const halfWidth = el.scrollWidth / 2;
      el.scrollLeft += (speed * delta) / 1000;
      if (halfWidth > 0 && el.scrollLeft >= halfWidth) {
        el.scrollLeft -= halfWidth;
      }

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isActive, isPaused]);

  const [isHovered, setIsHovered] = useState(false);

  if (videos.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative"
      onMouseEnter={() => { setIsPaused(true); setIsHovered(true); }}
      onMouseLeave={() => { setIsPaused(false); setIsHovered(false); }}
    >
      {/* Hover dark overlay — covers the whole section row */}
      <div className={`absolute -inset-x-8 -inset-y-4 rounded-2xl transition-all duration-200 pointer-events-none ${
        isHovered ? "bg-text-primary/[0.05]" : "bg-transparent"
      }`} />

      {/* Header */}
      <div className="relative z-[1] mb-3 flex items-center justify-between">
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="inline-flex items-center gap-2 font-display text-lg font-semibold text-text-primary rounded-lg px-2 py-1 -mx-2 transition-colors duration-200 hover:bg-surface-active"
          >
            {icon && <span className="text-text-secondary">{icon}</span>}
            {title}
            <svg className="h-4 w-4 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            {icon && <span className="text-text-secondary">{icon}</span>}
            {title}
          </h2>
        )}
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
          >
            See all →
          </Link>
        )}
      </div>

      {/* Scroll container */}
      <div className="group/section relative z-[1]">
        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-1"
        >
          {/* Original + clone for seamless infinite scroll */}
          {[...videos, ...videos].map((video, i) => (
            <div
              key={`${video.id}-${i}`}
              className={`w-[88vw] shrink-0 sm:w-[calc(50%-8px)] lg:w-[calc(50%-8px)] xl:w-[calc(33.333%-11px)] transition-transform duration-200 ${
                isHovered ? "scale-[1.02]" : ""
              } hover:!scale-105 hover:z-10`}
            >
              <VideoCard
                video={video}
                progress={progressMap?.[video.id]}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
