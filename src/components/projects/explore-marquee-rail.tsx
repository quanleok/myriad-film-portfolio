"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectFeedItem } from "@/components/projects/types";
import { getLifecycleVisual } from "@/components/projects/lifecycle-visuals";
import type { ProjectLifecycleStatus } from "@/types/project";

interface ExploreMarqueeRailProps {
  title: string;
  projects: ProjectFeedItem[];
  lifecycleStatus?: ProjectLifecycleStatus | null;
  onPreorder: (project: ProjectFeedItem) => void;
  onCardClick: (project: ProjectFeedItem) => void;
  onHoverPreview?: (project: ProjectFeedItem) => void;
}

export function ExploreMarqueeRail({
  title,
  projects,
  lifecycleStatus,
  onPreorder,
  onCardClick,
  onHoverPreview,
}: ExploreMarqueeRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  const totalCards = projects.length;

  // Entrance animation (one-shot)
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
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-scroll: advance one card every 5s, loop to start
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

  // Arrow navigation
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

  if (totalCards < 2) return null;

  const lifecycle = lifecycleStatus ? getLifecycleVisual(lifecycleStatus) : null;
  const dotClassName = lifecycle?.dotClassName ?? "bg-brand-500";

  return (
    <section
      ref={sectionRef}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(24px)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => setIsTouching(false)}
    >
      {/* Section header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-tertiary">
              {totalCards}
            </span>
          </div>
          <span className={`ml-5 h-0.5 w-12 rounded-full ${dotClassName}`} />
        </div>
      </div>

      {/* Rail wrapper */}
      <div className="group/rail relative">
        {/* Gradient fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-page to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-page to-transparent" />

        {/* Left arrow */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-lg backdrop-blur transition-opacity hover:bg-black/80"
          style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-lg backdrop-blur transition-opacity hover:bg-black/80"
          style={{ opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {projects.map((project) => (
            <div
              key={project.id}
              className="w-[300px] shrink-0 snap-start lg:w-[340px]"
            >
              <ProjectCard
                project={project}
                onPreorder={onPreorder}
                onCardClick={onCardClick}
                onHoverPreview={onHoverPreview}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
