"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PremiereBookmark } from "./PremiereBookmark";

interface PremiereVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  premiere_at: string;
}

interface UpcomingPremieresProps {
  videos: PremiereVideo[];
}

function getCountdownText(premiereAt: string): string {
  const diff = new Date(premiereAt).getTime() - Date.now();
  if (diff <= 0) return "Starting now!";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `Premieres in ${days}d ${hours}h`;

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Premieres in ${hours}h ${minutes}m`;

  return `Premieres in ${minutes}m`;
}

export function UpcomingPremieres({ videos }: UpcomingPremieresProps) {
  const [, setTick] = useState(0);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = videos.filter((v) => new Date(v.premiere_at).getTime() > Date.now());
  if (upcoming.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
        Upcoming Premieres
      </h2>
      <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
        {upcoming.map((video) => (
          <Link
            key={video.id}
            href={`/watch/${video.id}`}
            className="group w-[280px] shrink-0 overflow-hidden rounded-xl border border-[#F59E0B]/30 bg-page-secondary transition-colors hover:border-[#F59E0B]/60"
          >
            {/* Thumbnail with gold glow */}
            <div className="relative aspect-video bg-page">
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-surface to-page-secondary">
                  <span className="text-3xl">🎬</span>
                </div>
              )}
              {/* Gold border glow */}
              <div className="absolute inset-0 rounded-t-xl ring-1 ring-inset ring-[#F59E0B]/20" />
              {/* Premiere badge */}
              <span className="absolute left-2 top-2 rounded bg-[#F59E0B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                Premiere
              </span>
            </div>
            {/* Info */}
            <div className="p-3">
              <h3 className="text-sm font-medium text-text-primary line-clamp-1">
                {video.title}
              </h3>
              <p className="mt-1 text-xs text-[#F59E0B]">
                {getCountdownText(video.premiere_at)}
              </p>
              <PremiereBookmark videoId={video.id} size="sm" className="mt-2" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
