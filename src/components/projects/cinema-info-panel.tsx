"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Film, User, Image, BookOpen, Star, ExternalLink } from "lucide-react";
import {
  safeProgress,
  formatRuntime,
  formatProjectGenre,
  formatProjectFormat,
  formatCampaignEnd,
  formatCountdown,
  daysUntilDelivery,
  isFreeWatchProject,
  lifecyclePrimaryCta,
} from "@/components/projects/utils";
import { ProjectProgressBar } from "@/components/projects/project-progress-bar";
import { getLifecycleVisual, getLifecycleCtaClassName, getLifecycleTextClassName } from "@/components/projects/lifecycle-visuals";
import { createClient } from "@/lib/supabase/client";
import type { ProjectFeedItem } from "@/components/projects/types";
import type { CinemaSlide, SlideType } from "@/components/projects/cinema-media-area";

const LIFECYCLE_BORDER_COLORS: Record<string, string> = {
  unlocking: "border-l-teal-400/60",
  in_production: "border-l-purple-500",
  premiering: "border-l-amber-500",
  released: "border-l-green-500",
};

const LIFECYCLE_HEART_COLORS: Record<string, string> = {
  unlocking: "fill-teal-400 text-teal-300",
  in_production: "fill-purple-500 text-purple-500",
  premiering: "fill-amber-500 text-amber-500",
  released: "fill-green-500 text-green-500",
};

const SLIDE_ICONS: Record<SlideType, typeof Film> = {
  teaser: Film,
  character: User,
  concept: Image,
  story: BookOpen,
  creator: Star,
};

interface CinemaInfoPanelProps {
  project: ProjectFeedItem;
  slides: CinemaSlide[];
  activeSlideIndex: number;
  onSlideSelect: (index: number) => void;
  onPreorder: () => void;
  onComment: () => void;
}

export function CinemaInfoPanel({
  project,
  slides,
  activeSlideIndex,
  onSlideSelect,
  onPreorder,
  onComment,
}: CinemaInfoPanelProps) {
  const href = project.slug ? `/project/${project.slug}` : `/project/${project.id}`;
  const progress = safeProgress(project.preorder_count_cache, project.unlock_target);
  const target = project.unlock_target ?? 0;
  const preorderLabel = `${project.preorder_count_cache.toLocaleString()} / ${target.toLocaleString()} preorders · ${Math.round(progress)}%`;

  const isPurchase = project.lifecycle_status === "premiering" || project.lifecycle_status === "released";
  const isFreeWatch = isFreeWatchProject(project.lifecycle_status, project.release_price_cents);
  const ctaLabel = lifecyclePrimaryCta(project.lifecycle_status, {
    priceCents: project.preorder_price_cents,
    releasePriceCents: project.release_price_cents,
  });

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(project.like_count_cache ?? 0);

  // Reset like state when project changes
  useEffect(() => {
    setLiked(false);
    setLikeCount(project.like_count_cache ?? 0);
  }, [project.id, project.like_count_cache]);

  const handleLike = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = `/login?redirect=${encodeURIComponent(href)}`;
        return;
      }
      const res = await fetch(`/api/projects/${project.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount((prev) => data.liked ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch { /* ignore */ }
  }, [project.id, href]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${href}`;
    if (navigator.share) {
      try { await navigator.share({ title: project.title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [href, project.title]);

  // Auto-scroll active slide into view in navigator
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = navRef.current;
    if (!container) return;
    const activeEl = container.children[1]?.children[activeSlideIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeSlideIndex]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-950 text-white">
      {/* Project info */}
      <div className="space-y-3 border-b border-white/10 p-5">
        <div className="flex items-center gap-2">
          {project.profiles?.avatar_url ? (
            <img
              src={project.profiles.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
              {(project.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-white/90">
            {project.profiles?.display_name ?? "Unknown creator"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold leading-tight">{project.title}</h2>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getLifecycleVisual(project.lifecycle_status).badgeClassName}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${getLifecycleVisual(project.lifecycle_status).dotClassName}`} />
            {getLifecycleVisual(project.lifecycle_status).label}
          </span>
        </div>
        {project.hook && (
          <p className="text-sm leading-relaxed text-white/75">{project.hook}</p>
        )}

        {/* Meta: genre · format · runtime */}
        {(() => {
          const parts = [
            project.genre ? formatProjectGenre(project.genre) : null,
            project.format ? formatProjectFormat(project.format) : null,
            formatRuntime(project.runtime_minutes),
          ].filter(Boolean);
          return parts.length > 0 ? (
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{parts.join(" · ")}</p>
          ) : null;
        })()}

        {project.content_rating && project.content_rating !== "general" && (
          <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide ${
            project.content_rating === "mature"
              ? "border border-red-500/40 bg-red-500/20 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
              : "border border-amber-500/40 bg-amber-500/20 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
          }`}>
            {project.content_rating === "mature" ? "Rated R" : "PG-13"}
          </span>
        )}
      </div>

      {/* Lifecycle stats + CTA */}
      <div className="space-y-3 border-b border-white/10 p-5">
        <div className="space-y-1.5">
          {(() => {
            const status = project.lifecycle_status;

            if (status === "unlocking") {
              const campaignEnd = formatCampaignEnd(project.campaign_ends_at);
              return (
                <>
                  <ProjectProgressBar value={progress} className="h-1.5" vibrant status={status} />
                  <p className={`text-xs font-medium ${getLifecycleTextClassName(status)}`}>{preorderLabel}</p>
                  <p className="text-[10px] text-white/50">
                    {(project.preorders_today ?? 0) > 0 && (
                      <span className="text-white/70">+{project.preorders_today} today · </span>
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
                  <ProjectProgressBar value={pp} className="h-1.5" vibrant status={status} />
                  <p className={`text-xs font-medium ${getLifecycleTextClassName(status)}`}>
                    In Progress{pp > 0 ? ` · ${pp}%` : ""}
                  </p>
                  <p className="text-[10px] text-white/50">
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
                  <p className={`text-xs font-semibold ${getLifecycleTextClassName(status)}`}>
                    {project.premiere_date
                      ? `Premieres ${countdown} — ${new Date(project.premiere_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : "Premiering Soon"}
                  </p>
                  <p className="text-[10px] text-white/50">{viewers.toLocaleString()} viewers</p>
                </>
              );
            }

            if (status === "released") {
              const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
              return (
                <p className={`text-xs font-medium ${getLifecycleTextClassName(status)}`}>
                  ✓ Released · {viewers.toLocaleString()} viewers
                </p>
              );
            }

            return (
              <p className="text-xs text-white/50">
                {project.preorder_count_cache.toLocaleString()} preorders
              </p>
            );
          })()}
        </div>

        {project.lifecycle_status !== "failed_to_unlock" && project.lifecycle_status !== "cancelled" && (
          <>
            <button
              type="button"
              onClick={() => {
                if (isFreeWatch) {
                  window.location.href = href;
                  return;
                }
                onPreorder();
              }}
              className={`press-effect w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${getLifecycleCtaClassName(project.lifecycle_status)}`}
            >
              {ctaLabel}
            </button>
            {!isPurchase && (
              <p className="text-center text-[10px] text-white/40">Refund guaranteed if not unlocked</p>
            )}
          </>
        )}

        <Link
          href={href}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
        >
          <ExternalLink size={14} />
          Open Project
        </Link>
      </div>

      {/* Social buttons */}
      <div className="flex items-center justify-around border-b border-white/10 px-5 py-3">
        <button type="button" onClick={handleLike} className="bounce-tap flex items-center gap-1.5 text-sm">
          <Heart size={18} className={`transition-all duration-300 ${liked ? `${LIFECYCLE_HEART_COLORS[project.lifecycle_status] ?? "fill-red-500 text-red-500"} scale-110` : "text-white/70 scale-100"}`} />
          <span className="text-white/70">{likeCount}</span>
        </button>
        <button type="button" onClick={onComment} className="bounce-tap flex items-center gap-1.5 text-sm">
          <MessageCircle size={18} className="text-white/70" />
          <span className="text-white/70">{project.discussion_count_cache ?? 0}</span>
        </button>
        <button type="button" onClick={handleShare} className="bounce-tap flex items-center gap-1.5 text-sm">
          <Share2 size={18} className="text-white/70" />
          <span className="text-white/70">Share</span>
        </button>
      </div>

      {/* Slide navigator */}
      <div className="flex-1 overflow-y-auto p-3" ref={navRef}>
        <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-white/40">Slides</p>
        <div className="space-y-1">
          {slides.map((slide, i) => {
            const Icon = SLIDE_ICONS[slide.type];
            const isActive = i === activeSlideIndex;
            return (
              <button
                key={slide.key}
                type="button"
                onClick={() => onSlideSelect(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 hover:scale-[1.02] ${
                  isActive
                    ? `bg-white/10 text-white border-l-2 ${LIFECYCLE_BORDER_COLORS[project.lifecycle_status] ?? "border-l-white/40"}`
                    : "text-white/60 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{slide.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
