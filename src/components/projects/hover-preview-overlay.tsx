"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import type { ProjectFeedItem } from "@/components/projects/types";
import {
  safeProgress,
  getProjectTeaserUrl,
  getCardMediaUrl,
  formatCampaignEnd,
  formatCountdown,
  daysUntilDelivery,
  formatRuntime,
  formatProjectGenre,
  formatProjectFormat,
  isFreeWatchProject,
  lifecyclePrimaryCta,
} from "@/components/projects/utils";
import { ProjectProgressBar } from "@/components/projects/project-progress-bar";
import {
  getLifecycleVisual,
  getLifecycleCtaClassName,
  getLifecycleTextClassName,
} from "@/components/projects/lifecycle-visuals";
import { createPortal } from "react-dom";

interface MediaSlide {
  key: string;
  label: string;
  type: "video" | "image" | "placeholder";
  url: string | null;
  caption?: string;
}

function buildMediaSlides(project: ProjectFeedItem): MediaSlide[] {
  const slides: MediaSlide[] = [];
  const host = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME;

  // Teaser (video or thumbnail)
  const teaserUrl = getProjectTeaserUrl(project.teaser_asset_id, "720p");
  if (teaserUrl) {
    slides.push({ key: "teaser", label: "Teaser", type: "video", url: teaserUrl });
  } else if (project.teaser_thumbnail_url) {
    slides.push({ key: "teaser", label: "Teaser", type: "image", url: project.teaser_thumbnail_url });
  }

  // Character cards
  for (const card of [...(project.character_cards ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    const url = getCardMediaUrl(card.media_asset_id, card.media_type);
    if (url) {
      slides.push({
        key: `char-${card.id}`,
        label: card.name,
        type: card.media_type === "video" ? "video" : "image",
        url,
        caption: card.short_description ?? undefined,
      });
    }
  }

  // Concept cards
  for (const card of [...(project.concept_cards ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    const url = getCardMediaUrl(card.media_asset_id, card.media_type);
    if (url) {
      slides.push({
        key: `concept-${card.id}`,
        label: "Concept",
        type: card.media_type === "video" ? "video" : "image",
        url,
        caption: card.caption ?? undefined,
      });
    }
  }

  // Fallback if no media at all
  if (slides.length === 0) {
    slides.push({ key: "empty", label: "No media", type: "placeholder", url: null });
  }

  return slides;
}

interface HoverPreviewOverlayProps {
  project: ProjectFeedItem | null;
  onClose: () => void;
  onPreorder: (project: ProjectFeedItem) => void;
}

export function HoverPreviewOverlay({ project, onClose, onPreorder }: HoverPreviewOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = useMemo(() => (project ? buildMediaSlides(project) : []), [project]);

  // Reset slide index when project changes
  useEffect(() => {
    setSlideIndex(0);
  }, [project?.id]);

  // Animate in when project changes
  useEffect(() => {
    if (project) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [project]);

  // Escape + arrow key handler
  useEffect(() => {
    if (!project) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setSlideIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [project, onClose, slides.length]);

  // Auto-play video on current slide
  useEffect(() => {
    if (!project) return;
    const el = videoRef.current;
    if (el) {
      el.play().catch(() => undefined);
    }
    return () => {
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    };
  }, [project, slideIndex]);

  const handleMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => onClose(), 300);
  }, [onClose]);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  if (!project) return null;

  const href = project.slug ? `/project/${project.slug}` : `/project/${project.id}`;
  const progress = safeProgress(project.preorder_count_cache, project.unlock_target);
  const lifecycleVisual = getLifecycleVisual(project.lifecycle_status);
  const isFreeWatch = isFreeWatchProject(project.lifecycle_status, project.release_price_cents);

  const isPurchase = project.lifecycle_status === "premiering" || project.lifecycle_status === "released";
  const isTeaserProject = project.lifecycle_status === "teaser";
  const ctaLabel = lifecyclePrimaryCta(project.lifecycle_status, {
    priceCents: project.preorder_price_cents,
    releasePriceCents: project.release_price_cents,
  });

  const currentSlide = slides[slideIndex] ?? slides[0];
  const hasMultipleSlides = slides.length > 1;

  const overlay = (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Overlay panel */}
      <div
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none motion-safe:transition-all motion-safe:duration-150 ${
          visible ? "opacity-100 motion-safe:scale-100" : "opacity-0 motion-safe:scale-95"
        }`}
      >
        <div
          className="pointer-events-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
          style={{ maxHeight: "85vh" }}
        >
          {/* Media section */}
          <div className="relative aspect-video w-full bg-black">
            {currentSlide.type === "video" && currentSlide.url ? (
              <video
                ref={videoRef}
                key={currentSlide.key}
                src={currentSlide.url}
                muted={muted}
                playsInline
                loop
                preload="auto"
                className="h-full w-full object-cover"
              />
            ) : currentSlide.type === "image" && currentSlide.url ? (
              <img
                key={currentSlide.key}
                src={currentSlide.url}
                alt={currentSlide.label}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-white/40">
                No teaser available
              </div>
            )}

            {/* Sample badge */}
            {project.is_test && (
              <span className="absolute right-3 top-3 inline-flex items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-100 backdrop-blur-md shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                SAMPLE
              </span>
            )}

            {/* Caption overlay for character/concept slides */}
            {currentSlide.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
                <p className="text-xs font-medium text-white">{currentSlide.label}</p>
                <p className="mt-0.5 text-[11px] text-white/70 line-clamp-2">{currentSlide.caption}</p>
              </div>
            )}

            {/* Navigation arrows */}
            {hasMultipleSlides && (
              <>
                {slideIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {slideIndex < slides.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </>
            )}

            {/* Slide dots */}
            {hasMultipleSlides && (
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                {slides.map((slide, i) => (
                  <button
                    key={slide.key}
                    type="button"
                    onClick={() => setSlideIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === slideIndex ? "w-4 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Go to ${slide.label}`}
                  />
                ))}
              </div>
            )}

            {/* Volume toggle (only for video slides) */}
            {currentSlide.type === "video" && currentSlide.url && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Close preview"
            >
              <X size={16} />
            </button>

            {/* Slide counter */}
            {hasMultipleSlides && (
              <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                {slideIndex + 1} / {slides.length}
              </span>
            )}
          </div>

          {/* Info section */}
          <div className="space-y-3 overflow-y-auto p-6">
            {/* Creator row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {project.profiles?.avatar_url ? (
                  <img
                    src={project.profiles.avatar_url}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                    {(project.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="truncate text-sm font-medium text-white/90">
                  {project.profiles?.display_name ?? "Unknown creator"}
                </span>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${lifecycleVisual.badgeClassName}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${lifecycleVisual.dotClassName} ${project.lifecycle_status === "premiering" || project.lifecycle_status === "in_production" ? "animate-pulse" : ""}`} />
                {lifecycleVisual.label}
              </span>
            </div>

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

            {/* Title + hook */}
            <div>
              <Link href={href} onClick={onClose} className="group/title">
                <h3 className="font-display text-xl font-bold text-white transition-colors group-hover/title:text-white/80">
                  {project.title}
                </h3>
              </Link>
              {project.hook && (
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/60">{project.hook}</p>
              )}
            </div>

            {/* Progress / lifecycle stats */}
            <div className="space-y-1.5">
              {(() => {
                const status = project.lifecycle_status;

                if (status === "teaser") {
                  return (
                    <>
                      <p className={`text-xs font-semibold ${getLifecycleTextClassName(status)}`}>
                        Teaser project
                      </p>
                      <p className="text-[10px] text-white/50">
                        {(project.like_count_cache ?? 0).toLocaleString()} likes · {(project.save_count_cache ?? 0).toLocaleString()} saves
                      </p>
                    </>
                  );
                }

                if (status === "unlocking") {
                  const campaignEnd = formatCampaignEnd(project.campaign_ends_at);
                  return (
                    <>
                      <ProjectProgressBar value={progress} className="h-1.5" vibrant status={status} />
                      <p className={`text-xs font-medium ${getLifecycleTextClassName(status)}`}>
                        {project.preorder_count_cache.toLocaleString()} / {(project.unlock_target ?? 0).toLocaleString()} preorders · {Math.round(progress)}%
                      </p>
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

            {/* CTA */}
            {project.lifecycle_status !== "failed_to_unlock" && project.lifecycle_status !== "cancelled" && (
              <div>
                {isTeaserProject ? (
                  <Link
                    href={href}
                    onClick={onClose}
                    className={`press-effect block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all duration-200 ${getLifecycleCtaClassName(project.lifecycle_status)}`}
                  >
                    Open Project
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (isFreeWatch) {
                          window.location.href = href;
                        } else {
                          onPreorder(project);
                        }
                        onClose();
                      }}
                      className={`press-effect w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${getLifecycleCtaClassName(project.lifecycle_status)}`}
                    >
                      {ctaLabel}
                    </button>
                    {!isPurchase && (
                      <p className="mt-1.5 text-center text-[10px] text-white/40">Refund guaranteed if not unlocked</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}
