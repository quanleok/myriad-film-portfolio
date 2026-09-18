"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProjectFeedItem } from "@/components/projects/types";
import { getLifecycleVisual } from "@/components/projects/lifecycle-visuals";
import { formatProjectGenre } from "@/components/projects/utils";

interface ExploreHeroProps {
  projects: ProjectFeedItem[];
  onPreorder?: (project: ProjectFeedItem) => void;
}

export function ExploreHero({ projects, onPreorder }: ExploreHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const total = projects.length;

  useEffect(() => {
    if (isHovered || total <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, total]);

  if (total === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-hover to-surface px-8 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-text-primary">
          Be the first to launch a project
        </h2>
        <p className="mt-2 text-text-secondary">
          New AI film projects are coming soon.
        </p>
        <Link
          href="/projects/new"
          className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 press-effect"
        >
          Create a project
        </Link>
      </div>
    );
  }

  const project = projects[activeIndex];
  const slug = project.slug ?? project.id;
  const lifecycle = getLifecycleVisual(project.lifecycle_status);
  const thumbnailUrl = project.teaser_thumbnail_url;

  const ctaLabel =
    project.lifecycle_status === "unlocking"
      ? `Seed — $${((project.preorder_price_cents ?? 0) / 100).toFixed(0)}`
      : project.lifecycle_status === "in_production"
        ? `Preorder — $${((project.preorder_price_cents ?? 0) / 100).toFixed(0)}`
      : project.lifecycle_status === "premiering" || project.lifecycle_status === "released"
        ? `Watch — $${((project.release_price_cents ?? 0) / 100).toFixed(0)}`
        : "View Project";

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ minHeight: "clamp(280px, 40vh, 420px)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover blur-sm scale-105 transition-opacity duration-700"
          key={project.id}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />

      <div className="relative z-10 flex h-full items-end p-8 sm:p-12" style={{ minHeight: "inherit" }}>
        <div className="max-w-xl">
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${lifecycle.badgeClassName}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${lifecycle.dotClassName}`} />
            {lifecycle.label}
          </span>

          {project.genre && (
            <span className="ml-2 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {formatProjectGenre(project.genre)}
            </span>
          )}

          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl line-clamp-2">
            {project.title}
          </h2>

          {project.hook && (
            <p className="mt-2 text-sm text-white/70 line-clamp-2">{project.hook}</p>
          )}

          <p className="mt-2 text-xs text-white/50">
            by {project.profiles?.display_name ?? project.profiles?.username ?? "Unknown"}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPreorder?.(project)}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 press-effect"
            >
              {ctaLabel}
            </button>
            <Link
              href={`/project/${slug}`}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              View Project
            </Link>
          </div>
        </div>
      </div>

      {total > 1 && isHovered && (
        <>
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev - 1 + total) % total)}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Previous project"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveIndex((prev) => (prev + 1) % total)}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            aria-label="Next project"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {projects.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActiveIndex(i)}
              aria-label={`Go to project ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? `w-6 ${getLifecycleVisual(p.lifecycle_status).dotClassName}`
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
