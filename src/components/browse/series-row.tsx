"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { Tv } from "lucide-react";

export interface SeriesCardData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  genre: string;
  episode_count: number;
  season_count: number;
  creator_id: string;
  creator_name: string;
  creator_username: string;
}

interface SeriesRowProps {
  series: SeriesCardData[];
  title?: string;
  icon?: ReactNode;
  seeAllHref?: string;
}

export function SeriesRow({ series, title, icon, seeAllHref }: SeriesRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (series.length === 0) return null;

  return (
    <section className="relative">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
          {icon ?? <Tv size={18} className="text-text-secondary" />}
          {title || "Staff Pick Series"}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
          >
            See all &rarr;
          </Link>
        )}
      </div>

      <div className="group/row relative">
        <div
          ref={scrollRef}
          className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory"
        >
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/watch/series/${s.id}`}
              className="group block w-[85vw] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-surface border border-transparent transition-all duration-200 group-hover:border-border group-hover:shadow-lg">
                {s.thumbnail_url ? (
                  <img
                    src={s.thumbnail_url}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-surface via-surface-hover to-surface">
                    <svg className="h-8 w-8 text-text-tertiary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="2" />
                      <path d="M10 8l6 4-6 4V8z" fill="currentColor" opacity="0.3" />
                    </svg>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                {/* Series badge */}
                <div className="absolute top-2 left-2 rounded bg-surface px-2 py-0.5 text-xs font-medium text-text-primary">
                  {s.episode_count} episodes
                </div>

                {/* Hover play icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                    <svg className="h-5 w-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-sm font-medium text-text-primary line-clamp-1">{s.title}</h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {s.creator_name} &middot; {s.season_count} {s.season_count === 1 ? "season" : "seasons"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
