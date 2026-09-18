"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sanitizeProjectText } from "@/components/projects/display";
import type { ProjectFeedItem } from "@/components/projects/types";
import {
  daysUntilDelivery,
  formatCampaignEnd,
  formatCountdown,
  formatProjectFormat,
  formatProjectGenre,
  formatRuntime,
  safeProgress,
} from "@/components/projects/utils";
import { getLifecycleTextClassName, getLifecycleVisual } from "@/components/projects/lifecycle-visuals";

interface TrendingCarouselProps {
  projects: ProjectFeedItem[];
  title?: string;
  subtitle?: string;
}

export function TrendingCarousel({
  projects,
  title = "Trending Now",
  subtitle = "The projects everyone is watching",
}: TrendingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const totalCards = projects.length;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 300;
    const gap = 16;
    const idx = Math.round(el.scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(idx, totalCards - 1));
  }, [totalCards]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateActiveIndex, { passive: true });
    return () => el.removeEventListener("scroll", updateActiveIndex);
  }, [updateActiveIndex]);

  useEffect(() => {
    if (isHovered || isTouching || totalCards <= 1) return;
    const timer = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth
        : 300;
      const gap = 16;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const next = el.scrollLeft + cardWidth + gap;
      el.scrollTo({
        left: next > maxScroll ? 0 : next,
        behavior: "smooth",
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered, isTouching, totalCards]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 300;
    const gap = 16;
    const amount = dir === "left" ? -(cardWidth + gap) : cardWidth + gap;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth
      : 300;
    const gap = 16;
    el.scrollTo({ left: idx * (cardWidth + gap), behavior: "smooth" });
  }, []);

  if (totalCards === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => setIsTouching(false)}
    >
      <div className="mx-auto flex max-w-7xl items-end justify-between px-6 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Signal
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-2 text-sm text-white/56">{subtitle}</p> : null}
        </div>
        <Link
          href="/browse"
          className="text-sm font-medium text-white/56 transition-colors hover:text-white"
        >
          Browse all
        </Link>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#030605] to-transparent sm:w-12" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#030605] to-transparent sm:w-12" />

        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-emerald-950 bg-[#09110d] p-2 text-white transition-opacity hover:border-emerald-900 hover:bg-[#0d1712] sm:block"
          style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-emerald-950 bg-[#09110d] p-2 text-white transition-opacity hover:border-emerald-900 hover:bg-[#0d1712] sm:block"
          style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {projects.map((project, i) => (
            <TrendingCard key={project.id} project={project} index={i} revealed={revealed} />
          ))}
        </div>
      </div>

      {totalCards > 1 ? (
        <div className="mt-4 flex justify-center gap-1.5">
          {projects.map((p, i) => {
            const dotColor =
              i === activeIndex ? getLifecycleVisual(p.lifecycle_status).dotClassName : "";
            return (
              <button
                key={p.id}
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? `w-6 ${dotColor}` : "w-1.5 bg-white/18 hover:bg-white/32"
                }`}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function TrendingCard({
  project,
  index,
  revealed,
}: {
  project: ProjectFeedItem;
  index: number;
  revealed: boolean;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rotateX: y * -8, rotateY: x * 8 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const pct = safeProgress(project.preorder_count_cache, project.unlock_target);

  useEffect(() => {
    if (!revealed || !progressBarRef.current) return;
    const timeout = setTimeout(() => {
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct}%`;
      }
    }, index * 100 + 300);
    return () => clearTimeout(timeout);
  }, [revealed, pct, index]);

  const slug = project.slug ?? project.id;
  const thumbnailUrl = project.teaser_thumbnail_url;
  const creatorName =
    sanitizeProjectText(
      project.profiles?.display_name ??
        project.profiles?.username ??
        "Unknown Creator"
    ) || "Unknown Creator";
  const lifecycle = getLifecycleVisual(project.lifecycle_status);

  const progressBarColor =
    pct >= 100
      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
      : pct >= 50
        ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]"
        : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.3)]";

  return (
    <Link
      ref={cardRef}
      href={`/project/${slug}`}
      className="group relative flex-none snap-start overflow-hidden rounded-[24px] border border-emerald-950/80 bg-[#07110d] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      style={{
        width: "clamp(260px, 22vw, 300px)",
        aspectRatio: "3 / 4",
        opacity: revealed ? 1 : 0,
        transform: revealed
          ? `perspective(600px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.rotateX || tilt.rotateY ? 1.02 : 1})`
          : "translateX(40px)",
        transition: `opacity 0.5s ease ${index * 100}ms, transform 0.3s ease-out`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={sanitizeProjectText(project.title)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.24),transparent_32%),linear-gradient(180deg,#0d1712_0%,#07100c_100%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#040705] via-[#040705]/72 to-transparent" />

      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${lifecycle.badgeClassName}`}>
          {lifecycle.label}
        </span>
        <span className="rounded-full bg-[#0e1914] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/64">
          {formatProjectGenre(project.genre)}
        </span>
      </div>

      <div className="absolute inset-x-4 bottom-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">{creatorName}</p>
        <h3 className="mt-2 text-xl font-semibold leading-tight text-white">
          {sanitizeProjectText(project.title)}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/66">
          {sanitizeProjectText(
            project.hook ?? project.synopsis ?? "A live project page for an AI film in progress."
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.15em] text-white/48">
          <span>{formatProjectFormat(project.format)}</span>
          {project.runtime_minutes ? <span>{formatRuntime(project.runtime_minutes)}</span> : null}
          {project.premiere_date ? <span>{formatCountdown(project.premiere_date)}</span> : null}
          {!project.premiere_date && project.campaign_ends_at ? <span>{formatCampaignEnd(project.campaign_ends_at)}</span> : null}
          {project.delivery_deadline ? (
            <span>
              {daysUntilDelivery(project.delivery_deadline) != null
                ? `${daysUntilDelivery(project.delivery_deadline)}d`
                : null}
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#0e1914]">
            <div
              ref={progressBarRef}
              className={`h-full w-0 rounded-full transition-[width] duration-700 ease-out ${progressBarColor}`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/56">
            <span className={getLifecycleTextClassName(project.lifecycle_status)}>
              {project.preorder_count_cache.toLocaleString()} backed
            </span>
            {project.unlock_target ? (
              <span>{pct}% of {project.unlock_target.toLocaleString()}</span>
            ) : (
              <span>Live now</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
