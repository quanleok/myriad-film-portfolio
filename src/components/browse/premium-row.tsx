"use client";

import { useRef } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { formatDuration, formatCount, timeAgo, formatPrice } from "@/lib/utils";
import { CreatorHoverCard } from "@/components/ui/CreatorHoverCard";
import type { VideoWithCreator } from "@/types/video";

interface PremiumRowProps {
  videos: VideoWithCreator[];
}

export function PremiumRow({ videos }: PremiumRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (videos.length === 0) return null;

  return (
    <section className="relative">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
          <Crown size={18} className="text-text-secondary" />
          New Premium
        </h2>
        <Link
          href="/browse?premium=true&sort=newest"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
        >
          See all &rarr;
        </Link>
      </div>

      <div className="group/row relative">
        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory"
        >
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/watch/${video.id}`}
              className="group block w-[85vw] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]"
            >
              <div className="rounded-xl bg-surface overflow-hidden border border-border/50 transition-all duration-200 group-hover:shadow-[0_4px_20px_var(--card-glow)] group-hover:border-border group-hover:-translate-y-0.5">
                <div className="relative aspect-video overflow-hidden">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-page-secondary">
                      <svg className="h-10 w-10 text-text-tertiary" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}

                  {/* Premium badge — frosted glass, expands on hover */}
                  <div className="absolute top-2 right-2 z-10">
                    <div className="premium-badge flex h-[26px] items-center overflow-hidden rounded-full">
                      <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center">
                        <svg className="premium-badge-icon h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                      <span className="premium-badge-text whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest">
                        Premium
                      </span>
                    </div>
                  </div>

                  {/* Price badge */}
                  {video.price_cents != null && video.price_cents > 0 && (
                    <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-amber-400">
                      {formatPrice(video.price_cents)}
                    </div>
                  )}

                  {/* Duration badge */}
                  {video.duration_seconds != null && video.duration_seconds > 0 && (
                    <div className="absolute bottom-2 right-2 rounded-sm bg-black/70 px-1 py-0.5 text-xs font-medium text-white">
                      {formatDuration(video.duration_seconds)}
                    </div>
                  )}

                  {/* Hover play icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)] backdrop-blur-md">
                      <svg className="h-5 w-5 text-black ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 px-3 py-3">
                  <CreatorHoverCard creatorId={video.creator_id} className="shrink-0">
                    {video.creator_avatar ? (
                      <img
                        src={video.creator_avatar}
                        alt={video.creator_name}
                        className="h-9 w-9 rounded-lg object-cover transition-all duration-200 hover:ring-2 hover:ring-text-primary/30"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-xs font-medium text-text-secondary transition-all duration-200 hover:ring-2 hover:ring-text-primary/30">
                        {video.creator_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </CreatorHoverCard>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold text-text-primary line-clamp-2 leading-snug">{video.title}</h3>
                    <CreatorHoverCard creatorId={video.creator_id}>
                      <p className="mt-1 text-[13px] text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer inline-block">{video.creator_name}</p>
                    </CreatorHoverCard>
                    <p className="mt-0.5 text-[12px] text-text-tertiary">
                      {formatCount(video.view_count)} views
                      {video.published_at && <> &middot; {timeAgo(video.published_at)}</>}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
