"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Share2, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ProjectFeedItem } from "@/components/projects/types";
import { safeProgress, formatCampaignEnd, formatCountdown, daysUntilDelivery, formatRuntime, formatProjectGenre, formatProjectFormat } from "@/components/projects/utils";
import { ProjectProgressBar } from "@/components/projects/project-progress-bar";
import { getLifecycleVisual, getLifecycleCtaClassName, getLifecycleTextClassName } from "@/components/projects/lifecycle-visuals";

function CompactStats({ project, progress }: { project: ProjectFeedItem; progress: number }) {
  const status = project.lifecycle_status;
  const cls = `text-xs font-medium ${getLifecycleTextClassName(status)}`;

  if (status === "unlocking") {
    return <p className={cls}>{project.preorder_count_cache.toLocaleString()} / {(project.unlock_target ?? 0).toLocaleString()} preorders · {Math.round(progress)}%</p>;
  }
  if (status === "teaser") {
    return <p className={cls}>{project.like_count_cache?.toLocaleString() ?? "0"} likes · {project.discussion_count_cache?.toLocaleString() ?? "0"} comments</p>;
  }
  if (status === "in_production") {
    const daysLeft = daysUntilDelivery(project.delivery_deadline);
    return <p className={cls}>{project.update_count_cache ?? 0} updates{daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft}d left` : ""}</p>;
  }
  if (status === "premiering") {
    const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
    const countdown = formatCountdown(project.premiere_date);
    return <p className={cls}>{countdown ? `Premieres ${countdown}` : "Premiering"} · {viewers.toLocaleString()} viewers</p>;
  }
  if (status === "released") {
    const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
    return <p className={cls}>✓ Released · {viewers.toLocaleString()} viewers</p>;
  }
  return <p className="text-xs text-white/60">{project.preorder_count_cache.toLocaleString()} preorders</p>;
}

function FullStats({ project, progress }: { project: ProjectFeedItem; progress: number }) {
  const status = project.lifecycle_status;

  if (status === "unlocking") {
    const campaignEnd = formatCampaignEnd(project.campaign_ends_at);
    return (
      <div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProjectProgressBar value={progress} className="h-1.5 bg-white/20 sm:h-2" vibrant status={status} />
          </div>
          <span className={`shrink-0 text-xs font-semibold ${getLifecycleTextClassName(status)}`}>
            {project.preorder_count_cache.toLocaleString()} / {(project.unlock_target ?? 0).toLocaleString()} · {Math.round(progress)}%
          </span>
        </div>
        <p className="mt-1 text-[10px] text-white/60">
          {(project.preorders_today ?? 0) > 0 && <span className="text-white/80">+{project.preorders_today} today · </span>}
          {campaignEnd}
        </p>
      </div>
    );
  }

  if (status === "teaser") {
    return (
      <div className="space-y-1">
        <p className={`text-sm font-semibold ${getLifecycleTextClassName(status)}`}>
          Teaser project
        </p>
        <p className="text-xs text-white/70">
          {(project.save_count_cache ?? 0).toLocaleString()} saves · {(project.like_count_cache ?? 0).toLocaleString()} likes
        </p>
      </div>
    );
  }

  if (status === "in_production") {
    const expectedUpdates = Math.max(1, Math.ceil((project.production_window_days ?? 90) / 30));
    const updateProgress = Math.min(100, Math.round(((project.update_count_cache ?? 0) / expectedUpdates) * 100));
    const daysLeft = daysUntilDelivery(project.delivery_deadline);
    return (
      <div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProjectProgressBar value={updateProgress} className="h-1.5 bg-white/20 sm:h-2" vibrant status={status} />
          </div>
          <span className={`shrink-0 text-xs font-semibold ${getLifecycleTextClassName(status)}`}>
            {project.update_count_cache ?? 0} / {expectedUpdates} updates
          </span>
        </div>
        <p className="mt-1 text-[10px] text-white/60">
          {project.is_overdue ? (
            <span className="text-red-400">Delivery overdue</span>
          ) : project.delivery_deadline ? (
            <>Delivery by {new Date(project.delivery_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft}d left` : ""}</>
          ) : "In production"}
        </p>
      </div>
    );
  }

  if (status === "premiering") {
    const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
    const countdown = formatCountdown(project.premiere_date);
    return (
      <div className="space-y-1">
        <p className={`text-sm font-semibold ${getLifecycleTextClassName(status)}`}>
          {project.premiere_date
            ? `Premieres ${countdown} — ${new Date(project.premiere_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
            : "Premiering Soon"}
        </p>
        <p className="text-xs text-white/70">{viewers.toLocaleString()} viewers</p>
      </div>
    );
  }

  if (status === "released") {
    const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
    return (
      <p className={`text-sm font-medium ${getLifecycleTextClassName(status)}`}>
        ✓ Released · {viewers.toLocaleString()} viewers
      </p>
    );
  }

  return (
    <p className="text-xs text-white/60">{project.preorder_count_cache.toLocaleString()} preorders</p>
  );
}

interface FeedOverlayProps {
  project: ProjectFeedItem;
  onPreorder: () => void;
  onComment: () => void;
  currentSlide: number;
  isTeaser: boolean;
}

export function FeedOverlay({ project, onPreorder, onComment, currentSlide, isTeaser }: FeedOverlayProps) {
  const href = project.slug ? `/project/${project.slug}` : `/project/${project.id}`;
  const progress = safeProgress(project.preorder_count_cache, project.unlock_target);
  const [hookExpanded, setHookExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(project.like_count_cache ?? 0);
  const priceLabel = project.preorder_price_cents ? formatPrice(project.preorder_price_cents) : null;
  const runtimeStr = formatRuntime(project.runtime_minutes);
  const metaParts = [
    project.genre ? formatProjectGenre(project.genre) : null,
    project.format ? formatProjectFormat(project.format) : null,
    runtimeStr,
  ].filter(Boolean).join(" · ");
  const lifecycleVisual = getLifecycleVisual(project.lifecycle_status);
  const isTeaserProject = project.lifecycle_status === "teaser";
  const primaryActionLabel = (() => {
    if (isTeaserProject) {
      return "Open Project";
    }
    if (project.lifecycle_status === "unlocking") {
      return priceLabel ? `Seed — ${priceLabel}` : "Seed";
    }
    if (project.lifecycle_status === "in_production") {
      return priceLabel ? `Preorder — ${priceLabel}` : "Preorder";
    }
    if (project.lifecycle_status === "premiering" || project.lifecycle_status === "released") {
      const releasePrice = project.release_price_cents ? formatPrice(project.release_price_cents) : null;
      return releasePrice ? `Watch — ${releasePrice}` : "Watch";
    }
    return "View Project";
  })();
  const actionSupportCopy = (() => {
    switch (project.lifecycle_status) {
      case "unlocking":
        return "Seed it early. If it misses its goal, your preorder is refunded automatically.";
      case "teaser":
        return "Watch the teaser, explore the concept, and save it if you want to see it turn into a full launch later.";
      case "in_production":
        return "Production is live and preorders stay open until the premiere is scheduled.";
      case "premiering":
        return "The film is almost live. Grab access now so you can jump in when the room opens.";
      case "released":
        return "This one is ready right now. Open the project page to watch or buy access.";
      default:
        return "Open the project page for the full story, characters, and creator details.";
    }
  })();

  const heartColorMap: Record<string, string> = {
    teaser: "fill-white/80 text-white/80",
    unlocking: "fill-teal-400 text-teal-300",
    in_production: "fill-purple-500 text-purple-500",
    premiering: "fill-amber-500 text-amber-500",
    released: "fill-green-500 text-green-500",
  };
  const likedHeartClass = heartColorMap[project.lifecycle_status] ?? "fill-red-500 text-red-500";

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

  // ── Vertical social buttons (TikTok-style, right side) ──
  const socialButtons = (
    <div className="pointer-events-auto flex flex-col items-center gap-5">
      <button type="button" onClick={handleLike} className="bounce-tap flex flex-col items-center gap-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-transform duration-200">
          <Heart size={24} className={`transition-all duration-300 ${liked ? `${likedHeartClass} scale-110` : "text-white scale-100"}`} />
        </div>
        <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]">{likeCount}</span>
      </button>
      <button type="button" onClick={onComment} className="bounce-tap flex flex-col items-center gap-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
          <MessageCircle size={24} className="text-white" />
        </div>
        <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]">{project.discussion_count_cache ?? 0}</span>
      </button>
      <button type="button" onClick={handleShare} className="bounce-tap flex flex-col items-center gap-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
          <Share2 size={24} className="text-white" />
        </div>
        <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]">Share</span>
      </button>
    </div>
  );

  // ── Compact overlay for non-teaser slides ──
  if (!isTeaser) {
    return (
      <>
        {/* Vertical social buttons — right side */}
        <div className="pointer-events-none absolute bottom-36 right-3 z-30">
          {socialButtons}
        </div>
        {/* Compact bottom bar */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30">
          <div className="bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
            <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-3">
              <Link href={href} className="flex-1 truncate">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{project.title}</p>
                  {project.lifecycle_status !== "unlocking" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/80">
                      <span className={`h-1.5 w-1.5 rounded-full ${lifecycleVisual.dotClassName}`} />
                      {lifecycleVisual.label}
                    </span>
                  )}
                </div>
                <CompactStats project={project} progress={progress} />
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Full overlay for teaser slide (compact for mobile) ──
  return (
    <>
      {/* Vertical social buttons — right side */}
      <div className="pointer-events-none absolute bottom-52 right-3 z-30 sm:bottom-64">
        {socialButtons}
      </div>

      {/* Bottom overlay — reduced to ~35-40% viewport */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30">
        <div className="bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 sm:pt-24">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl space-y-2 sm:space-y-3">
            {/* Content rating + Creator row */}
            {project.content_rating && project.content_rating !== "general" ? (
              <span className={`inline-flex w-fit items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide ${
                project.content_rating === "mature"
                  ? "border border-red-500/40 bg-red-500/20 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                  : "border border-amber-500/40 bg-amber-500/20 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
              }`}>
                {project.content_rating === "mature" ? "Rated R" : "PG-13"}
              </span>
            ) : null}
            <div className="flex items-center gap-2 text-white/90">
              <Link
                href={project.profiles?.username ? `/creator/${project.profiles.username}` : "#"}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                {project.profiles?.avatar_url ? (
                  <img
                    src={project.profiles.avatar_url}
                    alt={project.profiles.display_name ?? "Creator"}
                    className="h-7 w-7 rounded-full border border-white/30 object-cover sm:h-8 sm:w-8 hover:border-white/60 transition-colors"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-black/35 text-[10px] font-semibold text-white sm:h-8 sm:w-8">
                    {(project.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium tracking-wide">
                  {project.profiles?.display_name ?? "Unknown creator"}
                </span>
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/25 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                <span className={`h-1.5 w-1.5 rounded-full ${lifecycleVisual.dotClassName}`} />
                {project.lifecycle_status === "unlocking" ? "Seed" : lifecycleVisual.label}
              </span>
            </div>

            {/* Sample project badge */}
            {project.is_test && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-100 backdrop-blur-md">
                SAMPLE PROJECT
              </span>
            )}

            {/* Title — smaller on mobile */}
            <h2 className="font-display text-2xl font-semibold leading-tight text-white sm:text-4xl">
              {project.title}
            </h2>

            {/* Meta line (genre · format · runtime) */}
            {metaParts && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{metaParts}</p>
            )}

            {/* Hook — 1 line on mobile, expandable */}
            <button
              type="button"
              onClick={() => setHookExpanded((prev) => !prev)}
              className="text-left"
            >
              <p
                className={`text-sm leading-relaxed text-white/90 transition-all duration-300 sm:text-lg ${
                  hookExpanded ? "" : "line-clamp-1 sm:line-clamp-2"
                }`}
              >
                {project.hook ?? "Unreleased AI film project"}
              </p>
            </button>

            <p className="max-w-2xl text-xs leading-5 text-white/72 sm:text-sm">
              {actionSupportCopy}
            </p>

            {/* Lifecycle-aware progress + stats */}
            <FullStats project={project} progress={progress} />

            {/* CTA row */}
            <div className="flex items-center gap-2">
              {isTeaserProject ? (
                <Link
                  href={href}
                  className={`press-effect min-h-11 flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all duration-200 sm:py-3 sm:text-base ${getLifecycleCtaClassName(project.lifecycle_status)}`}
                >
                  {primaryActionLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onPreorder}
                  className={`press-effect min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:py-3 sm:text-base ${getLifecycleCtaClassName(project.lifecycle_status)}`}
                >
                  {primaryActionLabel}
                </button>
              )}
              {/* Icon-only on mobile, text on desktop */}
              <Link
                href={href}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-black/35 text-white backdrop-blur-md sm:w-auto sm:px-4 sm:py-3"
                aria-label="Open Project"
              >
                <ChevronRight size={20} className="sm:hidden" />
                <span className="hidden text-sm font-semibold sm:inline">Open Project</span>
              </Link>
            </div>
            <p className="mt-1 text-center text-[10px] text-white/50">
              {isTeaserProject ? "No preorder or deadline attached yet" : "Refund guaranteed if not unlocked"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
