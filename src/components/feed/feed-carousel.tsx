"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  ProjectFeedItem,
  FeedCharacterCard,
  FeedConceptCard,
} from "@/components/projects/types";
import { FeedSlideTeaser } from "./feed-slide-teaser";
import { FeedSlideCharacter } from "./feed-slide-character";
import { FeedSlideConcept } from "./feed-slide-concept";
import { FeedSlideStory } from "./feed-slide-story";
import { FeedSlideCreator } from "./feed-slide-creator";
import { FeedOverlay } from "./feed-overlay";
import { FeedDotIndicator } from "./feed-dot-indicator";

type SlideType = "teaser" | "character" | "concept" | "story" | "creator";

interface Slide {
  type: SlideType;
  key: string;
  character?: FeedCharacterCard;
  concept?: FeedConceptCard;
}

interface FeedCarouselProps {
  project: ProjectFeedItem;
  isActive: boolean;
  onPreorder: () => void;
  onComment: () => void;
  /** Reset to slide 0 when this value changes */
  resetKey: number;
}

export function FeedCarousel({
  project,
  isActive,
  onPreorder,
  onComment,
  resetKey,
}: FeedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [currentSlide, setCurrentSlide] = useState(0);
  const [muted, setMuted] = useState(true);

  // Build slides array dynamically
  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];

    // 1. Teaser (always present)
    s.push({ type: "teaser", key: `teaser-${project.id}` });

    // 2. Character cards (sorted by sort_order)
    const chars = [...(project.character_cards ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    for (const card of chars) {
      s.push({ type: "character", key: `char-${card.id}`, character: card });
    }

    // 3. Concept cards (sorted by sort_order)
    const concepts = [...(project.concept_cards ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    for (const card of concepts) {
      s.push({ type: "concept", key: `concept-${card.id}`, concept: card });
    }

    // 4. Story (always present)
    s.push({ type: "story", key: `story-${project.id}` });

    // 5. Creator (always present)
    s.push({ type: "creator", key: `creator-${project.id}` });

    return s;
  }, [project]);

  // Reset to slide 0 when project changes or resetKey changes
  useEffect(() => {
    setCurrentSlide(0);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [resetKey, project.id]);

  // Track current slide via scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const slideWidth = el.clientWidth;
    if (slideWidth === 0) return;
    const index = Math.round(el.scrollLeft / slideWidth);
    setCurrentSlide(Math.max(0, Math.min(index, slides.length - 1)));
  }, [slides.length]);

  // Play/pause videos based on active state and current slide
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([key, video]) => {
      if (!video) return;
      const slideIndex = slides.findIndex((s) => s.key === key);
      if (isActive && slideIndex === currentSlide) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [isActive, currentSlide, slides]);

  // Update teaser muted state
  useEffect(() => {
    const teaserKey = `teaser-${project.id}`;
    const video = videoRefs.current[teaserKey];
    if (video) video.muted = muted;
  }, [muted, project.id]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const goToSlide = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }, [slides.length]);

  // Keyboard arrow navigation
  useEffect(() => {
    if (!isActive) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goToSlide(currentSlide - 1);
      else if (e.key === "ArrowRight") goToSlide(currentSlide + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentSlide, goToSlide]);

  return (
    <div className="group/carousel relative h-full w-full">
      {/* Dot indicator at top */}
      <div className="absolute left-4 top-[env(safe-area-inset-top,12px)] z-40 pt-3">
        <FeedDotIndicator total={slides.length} current={currentSlide} />
      </div>

      {/* Desktop arrow buttons */}
      {currentSlide > 0 && (
        <button
          type="button"
          onClick={() => goToSlide(currentSlide - 1)}
          className="absolute left-3 top-1/2 z-40 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 sm:flex sm:opacity-0 sm:group-hover/carousel:opacity-100"
          aria-label="Previous slide"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {currentSlide < slides.length - 1 && (
        <button
          type="button"
          onClick={() => goToSlide(currentSlide + 1)}
          className="absolute right-3 top-1/2 z-40 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity hover:bg-black/60 sm:flex sm:opacity-0 sm:group-hover/carousel:opacity-100"
          aria-label="Next slide"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scrollbar-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {slides.map((slide) => (
          <div
            key={slide.key}
            className="h-full w-full flex-shrink-0 snap-start"
          >
            {slide.type === "teaser" ? (
              <FeedSlideTeaser
                ref={(node) => {
                  videoRefs.current[slide.key] = node;
                }}
                teaserAssetId={project.teaser_asset_id}
                thumbnailUrl={project.teaser_thumbnail_url}
                title={project.title}
                muted={muted}
                onToggleMute={handleToggleMute}
              />
            ) : slide.type === "character" && slide.character ? (
              <FeedSlideCharacter
                ref={(node) => {
                  if (slide.character?.media_type === "video") {
                    videoRefs.current[slide.key] = node;
                  }
                }}
                card={slide.character}
              />
            ) : slide.type === "concept" && slide.concept ? (
              <FeedSlideConcept
                ref={(node) => {
                  if (slide.concept?.media_type === "video") {
                    videoRefs.current[slide.key] = node;
                  }
                }}
                card={slide.concept}
              />
            ) : slide.type === "story" ? (
              <FeedSlideStory
                synopsis={project.synopsis}
                genre={project.genre}
                tone={project.tone}
                format={project.format}
                runtimeMinutes={project.runtime_minutes}
                inspirationLine={project.inspiration_line}
                thumbnailUrl={project.teaser_thumbnail_url}
              />
            ) : slide.type === "creator" ? (
              <FeedSlideCreator
                creator={project.creator}
                profiles={project.profiles}
                thumbnailUrl={project.teaser_thumbnail_url}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Fixed bottom overlay — collapses on non-teaser slides */}
      <FeedOverlay project={project} onPreorder={onPreorder} onComment={onComment} currentSlide={currentSlide} isTeaser={slides[currentSlide]?.type === "teaser"} />
    </div>
  );
}
