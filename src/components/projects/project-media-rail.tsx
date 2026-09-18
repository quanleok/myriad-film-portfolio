"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

interface CharacterCard {
  id: string;
  sort_order: number;
  name: string;
  short_description: string | null;
  media_asset_id: string | null;
  media_type: "image" | "video" | null;
}

interface ConceptCard {
  id: string;
  sort_order: number;
  caption: string | null;
  media_asset_id: string | null;
  media_type: "image" | "video" | null;
}

export interface MediaItem {
  type: "teaser" | "character" | "concept";
  label: string;
  thumbnailUrl: string | null;
  mediaAssetId: string | null;
  mediaType: "image" | "video" | null;
  // Character-specific
  name?: string;
  description?: string | null;
  // Concept-specific
  caption?: string | null;
}

export function buildMediaItems(
  teaserThumbnailUrl: string | null,
  characters: CharacterCard[],
  concepts: ConceptCard[],
  cdnHost: string | null
): MediaItem[] {
  const items: MediaItem[] = [
    {
      type: "teaser",
      label: "Teaser",
      thumbnailUrl: teaserThumbnailUrl,
      mediaAssetId: null,
      mediaType: "video",
    },
  ];

  for (const c of characters) {
    const thumb =
      c.media_asset_id && cdnHost
        ? `https://${cdnHost}/${c.media_asset_id}/thumbnail.jpg`
        : null;
    items.push({
      type: "character",
      label: c.name,
      thumbnailUrl: thumb,
      mediaAssetId: c.media_asset_id,
      mediaType: c.media_type,
      name: c.name,
      description: c.short_description,
    });
  }

  for (let i = 0; i < concepts.length; i++) {
    const c = concepts[i];
    const thumb =
      c.media_asset_id && cdnHost
        ? `https://${cdnHost}/${c.media_asset_id}/thumbnail.jpg`
        : null;
    items.push({
      type: "concept",
      label: c.caption ? c.caption : `Concept ${i + 1}`,
      thumbnailUrl: thumb,
      mediaAssetId: c.media_asset_id,
      mediaType: c.media_type,
      caption: c.caption,
    });
  }

  return items;
}

interface ProjectMediaRailProps {
  items: MediaItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ProjectMediaRail({
  items,
  activeIndex,
  onSelect,
}: ProjectMediaRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [checkScroll, items]);

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  // Don't render if only teaser (no cards)
  if (items.length <= 1) return null;

  return (
    <div className="brand-edge-line relative hidden md:block group">
      {/* Left arrow */}
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          className="absolute inset-y-0 left-0 z-20 flex w-8 items-center justify-center bg-gradient-to-r from-page to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ChevronLeft size={18} className="text-text-primary" />
        </button>
      ) : null}

      {/* Right arrow */}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollBy(200)}
          className="absolute inset-y-0 right-0 z-20 flex w-8 items-center justify-center bg-gradient-to-l from-page to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ChevronRight size={18} className="text-text-primary" />
        </button>
      ) : null}

      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <button
            key={`${item.type}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className={`group flex shrink-0 flex-col items-center gap-1 transition-opacity ${
              activeIndex === index ? "opacity-100" : "opacity-60 hover:opacity-90"
            }`}
          >
            <div
              className={`relative h-[80px] w-auto overflow-hidden rounded-lg border-2 transition-colors ${
                activeIndex === index
                  ? "border-role-edge-strong"
                  : "border-transparent"
              }`}
            >
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.label}
                  className="h-full w-auto min-w-[80px] max-w-[120px] object-cover"
                />
              ) : (
                <div className="flex h-full w-[100px] items-center justify-center bg-surface text-text-tertiary">
                  {item.type === "teaser" ? (
                    <Play size={20} />
                  ) : (
                    <span className="text-xs">
                      {item.type === "character" ? "CH" : "CO"}
                    </span>
                  )}
                </div>
              )}

              {/* Play icon overlay for teaser */}
              {item.type === "teaser" && item.thumbnailUrl ? (
                <div className="absolute inset-0 flex items-center justify-center media-overlay-scrim">
                  <Play size={18} className="text-white drop-shadow" fill="currentColor" />
                </div>
              ) : null}
            </div>

            <span className="max-w-[120px] truncate text-[11px] text-text-tertiary">
              {item.label}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
