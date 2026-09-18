"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Heart, Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { formatCount, formatPrice } from "@/lib/utils";
import type { ProjectFeedItem } from "@/components/projects/types";
import {
  formatProjectGenre,
  formatProjectFormat,
  formatRuntime,
  getProjectTeaserUrl,
  safeProgress,
  formatCampaignEnd,
  formatCountdown,
  daysUntilDelivery,
  isFreeWatchProject,
} from "@/components/projects/utils";
import { ProjectProgressBar } from "@/components/projects/project-progress-bar";
import { getLifecycleVisual, getLifecycleHoverGlow, getLifecycleCtaClassName, getLifecycleTextClassName } from "@/components/projects/lifecycle-visuals";

interface ProjectCardProps {
  project: ProjectFeedItem;
  compact?: boolean;
  showStatus?: boolean;
  isHero?: boolean;
  onPreorder?: (project: ProjectFeedItem) => void;
  onCardClick?: (project: ProjectFeedItem) => void;
  onHoverPreview?: (project: ProjectFeedItem) => void;
}

export function ProjectCard({ project, compact = false, showStatus = true, isHero = false, onPreorder, onCardClick, onHoverPreview }: ProjectCardProps) {
  const canPreview = Boolean(project.teaser_asset_id && process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME);
  const [showPreview, setShowPreview] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(project.save_count_cache ?? 0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = safeProgress(project.preorder_count_cache, project.unlock_target);

  const handleEnter = useCallback(() => {
    // Inline video preview (600ms)
    if (canPreview) {
      hoverTimerRef.current = setTimeout(() => {
        setShowPreview(true);
        const el = videoRef.current;
        if (!el) return;
        el.play().catch(() => undefined);
      }, 600);
    }

    // Hover preview overlay (500ms, desktop only)
    if (onHoverPreview && window.matchMedia("(min-width: 1024px)").matches) {
      hoverPreviewTimerRef.current = setTimeout(() => {
        onHoverPreview(project);
      }, 500);
    }
  }, [canPreview, onHoverPreview, project]);

  const handleLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (hoverPreviewTimerRef.current) {
      clearTimeout(hoverPreviewTimerRef.current);
      hoverPreviewTimerRef.current = null;
    }
    const el = videoRef.current;
    if (el) el.pause();
    setShowPreview(false);
  }, []);

  // Cancel hover preview timer on scroll
  useEffect(() => {
    const cancel = () => {
      if (hoverPreviewTimerRef.current) {
        clearTimeout(hoverPreviewTimerRef.current);
        hoverPreviewTimerRef.current = null;
      }
    };
    window.addEventListener("scroll", cancel, { passive: true });
    return () => window.removeEventListener("scroll", cancel);
  }, []);

  useEffect(() => {
    setThumbnailFailed(false);
  }, [project.teaser_thumbnail_url]);

  const teaserUrl = getProjectTeaserUrl(project.teaser_asset_id);
  const href = project.slug ? `/project/${project.slug}` : `/project/${project.id}`;
  const isPurchase = project.lifecycle_status === "premiering" || project.lifecycle_status === "released";
  const isFreeWatch = isFreeWatchProject(project.lifecycle_status, project.release_price_cents);

  const metaParts = [
    project.genre ? formatProjectGenre(project.genre) : null,
    project.format ? formatProjectFormat(project.format) : null,
    project.format === "series" && project.episode_count
      ? `${project.episode_count} Episodes`
      : formatRuntime(project.runtime_minutes),
  ].filter(Boolean);
  const metaLine = metaParts.join(" \u00B7 ");

  const lifecycleVisual = getLifecycleVisual(project.lifecycle_status);
  const hoverGlow = getLifecycleHoverGlow(project.lifecycle_status);

  const wrapperClassName = `group surface-edge-glow block overflow-hidden rounded-xl border border-role-border-subtle bg-page-secondary transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] ${hoverGlow} ${
    isHero ? "col-span-2 row-span-2" : ""
  }`;

  const cardContent = (
    <>
      <div
        className={`relative overflow-hidden bg-role-bg-canvas ${isHero ? "aspect-[16/10]" : "aspect-video"}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {project.teaser_thumbnail_url && !thumbnailFailed ? (
          <img
            src={project.teaser_thumbnail_url}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-600/10 via-surface to-surface-hover px-4 text-center">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {project.genre ?? "Coming Soon"}
            </span>
            <span className="line-clamp-2 font-display text-sm font-semibold text-text-secondary">
              {project.title}
            </span>
          </div>
        )}

        {teaserUrl ? (
          <video
            ref={videoRef}
            src={teaserUrl}
            muted
            playsInline
            loop
            preload="none"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              showPreview ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}

        <div className="media-overlay-gradient absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-8">
          {(() => {
            const status = project.lifecycle_status;

            if (status === "teaser") {
              return (
                <>
                  <p className={`text-[11px] font-semibold ${getLifecycleTextClassName(status)}`}>
                    Watch the teaser
                  </p>
                  <p className="text-[10px] text-white/60">
                    {(project.like_count_cache ?? 0).toLocaleString()} likes · {(project.discussion_count_cache ?? 0).toLocaleString()} comments
                  </p>
                </>
              );
            }

            if (status === "unlocking") {
              const campaignEnd = formatCampaignEnd(project.campaign_ends_at);
              return (
                <>
                  <ProjectProgressBar value={progress} className="h-1" vibrant status={status} />
                  <p className="mt-1 text-[11px] text-white/90">
                    {project.preorder_count_cache.toLocaleString()} / {(project.unlock_target ?? 0).toLocaleString()} preorders
                    <span className="ml-1 font-semibold">{Math.round(progress)}%</span>
                    {progress >= 100 ? (
                      <span className={`ml-1 ${getLifecycleTextClassName(status)}`}>Unlocked</span>
                    ) : progress >= 50 ? (
                      <span className={`ml-1 ${getLifecycleTextClassName(status)}`}>50%+ reached</span>
                    ) : null}
                  </p>
                  <p className="text-[10px] text-white/60">
                    {(project.preorders_today ?? 0) > 0 && (
                      <span className="text-white/80">+{project.preorders_today} today · </span>
                    )}
                    {campaignEnd}
                  </p>
                </>
              );
            }

            if (status === "in_production") {
              const pp = project.production_progress ?? 0;
              const daysLeft = daysUntilDelivery(project.delivery_deadline);
              return (
                <>
                  <ProjectProgressBar value={pp} className="h-1" vibrant status={status} />
                  <p className="mt-1 text-[11px] text-white/90">
                    In Progress{pp > 0 ? ` · ${pp}%` : ""}
                  </p>
                  <p className="text-[10px] text-white/60">
                    {project.is_overdue ? (
                      <span className="text-red-400">Delivery overdue</span>
                    ) : project.delivery_deadline ? (
                      <>Delivery by {new Date(project.delivery_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft}d left` : ""}</>
                    ) : "In production"}
                  </p>
                </>
              );
            }

            if (status === "premiering") {
              const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
              const countdown = formatCountdown(project.premiere_date);
              return (
                <>
                  <p className={`text-[11px] font-semibold ${getLifecycleTextClassName(status)}`}>
                    {project.premiere_date
                      ? `Premieres ${countdown} — ${new Date(project.premiere_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : "Premiering Soon"}
                  </p>
                  <p className="text-[10px] text-white/70">{viewers.toLocaleString()} viewers</p>
                </>
              );
            }

            if (status === "released") {
              const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
              return (
                <p className={`text-[11px] font-medium ${getLifecycleTextClassName(status)}`}>
                  ✓ Released · {viewers.toLocaleString()} viewers
                </p>
              );
            }

            // failed_to_unlock / cancelled / draft
            return (
              <p className="text-[11px] text-white/60">
                {project.preorder_count_cache.toLocaleString()} preorders
              </p>
            );
          })()}
        </div>

        {showStatus ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-md border border-role-edge-soft bg-role-bg-overlay-soft px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${lifecycleVisual.dotClassName} ${project.lifecycle_status === "premiering" || project.lifecycle_status === "in_production" ? "animate-pulse" : ""}`} aria-hidden="true" />
            {project.lifecycle_status === "teaser"
              ? "Teaser"
              : project.lifecycle_status === "unlocking"
              ? "Seed"
              : project.lifecycle_status === "premiering"
              ? project.premiere_date
                ? `Premieres ${new Date(project.premiere_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : "Premiering Soon"
              : lifecycleVisual.label}
          </span>
        ) : null}

        {project.is_test ? (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-100 backdrop-blur-md shadow-[0_0_8px_rgba(245,158,11,0.3)]">
            SAMPLE
          </span>
        ) : project.content_rating && project.content_rating !== "general" ? (
          <span className={`absolute right-2.5 top-2.5 inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide backdrop-blur-md ${
            project.content_rating === "mature"
              ? "border border-red-500/40 bg-red-500/20 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
              : "border border-amber-500/40 bg-amber-500/20 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          }`}>
            {project.content_rating === "mature" ? "R" : "PG-13"}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5 p-4">
        {metaLine ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{metaLine}</p>
        ) : null}

        <h3
          className={`font-display font-semibold text-text-primary ${
            compact ? "line-clamp-1 text-sm" : isHero ? "line-clamp-2 text-lg" : "line-clamp-2"
          }`}
        >
          {project.title}
        </h3>
        <p className={`line-clamp-1 text-text-secondary ${isHero ? "text-sm" : "text-xs"}`}>{project.hook ?? "No hook yet"}</p>

        {project.lifecycle_status === "teaser" ? (
          <p className="text-xs font-medium text-role-fg-secondary">
            {(project.like_count_cache ?? 0).toLocaleString()} likes · {(project.save_count_cache ?? 0).toLocaleString()} saves
          </p>
        ) : isPurchase && isFreeWatch ? (
          <p className="text-xs font-medium text-role-success-fg">Free to watch</p>
        ) : (project.lifecycle_status === "premiering" || project.lifecycle_status === "released") && project.release_price_cents ? (
          <p className="text-xs font-medium text-role-fg-secondary">{formatPrice(project.release_price_cents)}</p>
        ) : project.preorder_price_cents ? (
          <p className="text-xs font-medium text-role-fg-secondary">{formatPrice(project.preorder_price_cents)}</p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1 text-xs text-text-tertiary">
          <Link
            href={project.profiles?.username ? `/creator/${project.profiles.username}` : "#"}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 min-w-0 hover:text-text-secondary transition-colors"
          >
            {project.profiles?.avatar_url ? (
              <img
                src={project.profiles.avatar_url}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[9px] font-medium">
                {(project.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <p className="truncate">{project.profiles?.display_name ?? "Unknown creator"}</p>
          </Link>
          <div className="flex items-center gap-2">
            {(project.lifecycle_status === "teaser" || project.lifecycle_status === "unlocking") && (project.interest_count_cache ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <Sparkles size={12} /> {formatCount(project.interest_count_cache ?? 0)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Heart size={12} /> {formatCount(project.like_count_cache ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={12} /> {formatCount(project.discussion_count_cache ?? 0)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const wasSaved = saved;
                setSaved(!wasSaved);
                setSaveCount((prev: number) => wasSaved ? Math.max(0, prev - 1) : prev + 1);
                fetch(`/api/projects/${project.id}/save`, { method: "POST" })
                  .then((res) => res.json())
                  .then((data: { saved?: boolean; count?: number }) => {
                    if (typeof data.saved === "boolean") setSaved(data.saved);
                    if (typeof data.count === "number") setSaveCount(data.count);
                  })
                  .catch(() => {
                    setSaved(wasSaved);
                    setSaveCount((prev: number) => wasSaved ? prev + 1 : Math.max(0, prev - 1));
                  });
              }}
              className="inline-flex items-center gap-1 text-text-tertiary transition-colors hover:text-text-primary"
              aria-label={saved ? "Unsave project" : "Save project"}
            >
              {saved ? <BookmarkCheck size={14} className="fill-current text-brand-500" /> : <Bookmark size={14} />}
              {saveCount > 0 && <span>{formatCount(saveCount)}</span>}
            </button>
          </div>
        </div>

        {project.lifecycle_status === "teaser" ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              window.location.href = href;
            }}
            className={`press-effect mt-2 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${getLifecycleCtaClassName(project.lifecycle_status)}`}
          >
            Open Project
          </button>
        ) : onPreorder && project.lifecycle_status !== "failed_to_unlock" && project.lifecycle_status !== "cancelled" ? (() => {
          const isUnlocking = project.lifecycle_status === "unlocking";
          const progressPct = Math.min(100, progress);
          const progressColor = progress >= 80 ? "bg-green-500" : "bg-teal-400";
          const ctaClass = getLifecycleCtaClassName(project.lifecycle_status);
          return (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isFreeWatch) {
                    window.location.href = href;
                    return;
                  }
                  onPreorder(project);
                }}
                className={`press-effect relative mt-2 w-full overflow-hidden rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${ctaClass}`}
              >
                {/* Progress fill behind text for unlocking projects */}
                {isUnlocking && (
                  <span
                    className={`absolute inset-y-0 left-0 ${progressColor} transition-all duration-700 ease-out`}
                    style={{ width: `${progressPct}%`, opacity: 0.2 }}
                  />
                )}
                <span className="relative z-10">
                  {isFreeWatch
                    ? project.lifecycle_status === "released"
                      ? "Watch Free"
                      : "Watch Premiere"
                    : project.lifecycle_status === "released"
                    ? `Watch — ${formatPrice(project.release_price_cents!)}`
                    : isPurchase
                      ? `Buy Access — ${formatPrice(project.release_price_cents!)}`
                      : project.lifecycle_status === "unlocking"
                        ? `Seed ${project.preorder_price_cents ? `— ${formatPrice(project.preorder_price_cents)}` : ""}`
                        : `Preorder ${project.preorder_price_cents ? formatPrice(project.preorder_price_cents) : ""}`}
                </span>
              </button>
              {!isPurchase ? (
                <p className="mt-1 text-center text-[10px] text-text-tertiary">
                  {project.lifecycle_status === "unlocking"
                    ? "Refund guaranteed if it does not unlock"
                    : "Preorders stay open until premiere"}
                </p>
              ) : null}
            </>
          );
        })() : null}
      </div>
    </>
  );

  if (onCardClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onCardClick(project)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onCardClick(project); }}
        className={`${wrapperClassName} cursor-pointer`}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={href} className={wrapperClassName}>
      {cardContent}
    </Link>
  );
}
