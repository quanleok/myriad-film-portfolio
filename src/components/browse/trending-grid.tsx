"use client";

import Link from "next/link";
import { TrendingUp, Star } from "lucide-react";
import { VideoCard } from "@/components/video/video-card";
import type { VideoWithCreator } from "@/types/video";

interface TrendingGridProps {
  videos: VideoWithCreator[];
  title?: string;
  href?: string;
}

export function TrendingGrid({ videos, title = "Trending Now", href = "/browse?sort=trending" }: TrendingGridProps) {
  if (videos.length === 0) return null;

  const isFeatured = title !== "Trending Now";

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={href}
          className="inline-flex items-center gap-2 font-display text-lg font-semibold text-text-primary rounded-lg px-2 py-1 -mx-2 transition-colors duration-200 hover:bg-surface-active"
        >
          <span className="text-text-secondary">
            {isFeatured ? <Star size={18} /> : <TrendingUp size={18} />}
          </span>
          {title}
          <svg className="h-4 w-4 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}
