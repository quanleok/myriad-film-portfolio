"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDuration, formatCount, timeAgo } from "@/lib/utils";
import { VideoCardMenu } from "./video-card-menu";
import { VideoWatchingNowBadge } from "./VideoWatchingNowBadge";
import { CreatorHoverCard } from "@/components/ui/CreatorHoverCard";
import type { VideoWithCreator } from "@/types/video";
import { VideoCardActions } from "./video-card-actions";
import { PremiereBookmark } from "@/components/premiere/PremiereBookmark";

const BUNNY_CDN = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME;

function getPremiereCountdownText(premiereAt: string): string {
  const diff = new Date(premiereAt).getTime() - Date.now();
  if (diff <= 0) return "Starting now!";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Premieres in ${days}d ${hours}h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Premieres in ${hours}h ${minutes}m`;
  return `Premieres in ${minutes}m`;
}

interface VideoCardProps {
  video: VideoWithCreator;
  /** Show a progress bar at the bottom of the thumbnail (0-100) */
  progress?: number;
  /** Called when user marks "not interested" or blocks creator */
  onHide?: () => void;
  /** Optional surface styling variant */
  variant?: "default" | "watch";
}

export function VideoCard({ video, progress, onHide, variant = "default" }: VideoCardProps) {
  const thumbnailSrc = video.thumbnail_url;
  const isUpcomingPremiere = video.is_premiere && !video.premiere_ended && video.premiere_at && new Date(video.premiere_at) > new Date();
  const isWatchVariant = variant === "watch";
  const aiToolLabel = video.ai_tool?.trim() || null;

  const [hidden, setHidden] = useState(false);
  const canPreview = !!(BUNNY_CDN && video.bunny_video_id);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!canPreview) return;
    hoverTimerRef.current = setTimeout(() => {
      setShowPreview(true);
      // Set src and play after state update
      requestAnimationFrame(() => {
        const el = videoRef.current;
        if (el) {
          el.src = `https://${BUNNY_CDN}/${video.bunny_video_id}/play_480p.mp4`;
          el.play().catch(() => {});
        }
      });
    }, 800);
  }, [canPreview, video.bunny_video_id]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (!canPreview) return;
    setShowPreview(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  }, [canPreview]);

  const handleHide = useCallback(() => {
    setHidden(true);
    onHide?.();
  }, [onHide]);

  if (hidden) return null;

  return (
    <div className="group relative">
      <div
        className={`overflow-hidden rounded-[1.35rem] transition-all duration-200 group-hover:-translate-y-0.5 ${
          isUpcomingPremiere
            ? "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14),0_16px_38px_rgba(0,0,0,0.28)] group-hover:shadow-[inset_0_0_0_1px_rgba(245,158,11,0.24),0_24px_56px_rgba(0,0,0,0.34)]"
            : isWatchVariant
              ? "bg-[linear-gradient(180deg,rgba(9,14,12,0.96),rgba(6,10,8,0.98))] shadow-[inset_0_0_0_1px_rgba(93,202,165,0.1),0_18px_46px_rgba(3,7,5,0.34)] group-hover:shadow-[inset_0_0_0_1px_rgba(93,202,165,0.24),0_24px_58px_rgba(0,0,0,0.4),0_0_32px_rgba(0,232,123,0.08)]"
              : "bg-surface/95 shadow-[inset_0_0_0_1px_rgba(127,119,221,0.08),0_16px_38px_rgba(0,0,0,0.28)] group-hover:shadow-[inset_0_0_0_1px_rgba(127,119,221,0.16),0_24px_56px_rgba(0,0,0,0.34)]"
        }`}
      >
        <Link
          href={`/watch/${video.id}`}
          className={`block rounded-[1.35rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
            isWatchVariant ? "focus-visible:ring-[rgba(93,202,165,0.68)]" : "focus-visible:ring-[#7F77DD]"
          }`}
        >
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="relative aspect-video overflow-hidden">
              {thumbnailSrc ? (
                <Image
                  src={thumbnailSrc}
                  alt={video.title}
                  fill
                  sizes="(max-width: 640px) 88vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-surface via-surface-hover to-surface">
                  <svg className="h-8 w-8 text-text-tertiary/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <path d="M10 8l6 4-6 4V8z" fill="currentColor" opacity="0.3" />
                  </svg>
                </div>
              )}

              {/* Video preview overlay */}
              {canPreview && (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  loop
                  preload="none"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                    showPreview ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}

              <div
                className={`pointer-events-none absolute inset-0 opacity-85 ${
                  isWatchVariant
                    ? "bg-gradient-to-t from-[#07110d]/86 via-[#09140f]/34 to-transparent"
                    : "bg-gradient-to-t from-black/24 via-transparent to-transparent"
                }`}
              />

              {/* Duration badge */}
              {video.duration_seconds != null && video.duration_seconds > 0 && (
                <div className={`absolute bottom-2 right-2 rounded-sm bg-black/70 px-1 py-0.5 text-xs font-medium text-white transition-opacity duration-300 ${
                  showPreview ? "opacity-0" : ""
                }`}>
                  {formatDuration(video.duration_seconds)}
                </div>
              )}

              {/* Premiere badge */}
              {isUpcomingPremiere && (
                <span className="absolute left-2 top-2 z-10 rounded bg-[#F59E0B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                  Premiere
                </span>
              )}

              {aiToolLabel ? (
                <span
                  className={`absolute right-2 top-2 z-10 max-w-[68%] truncate rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md ${
                    isWatchVariant
                      ? "border-[rgba(148,134,255,0.3)] bg-[rgba(18,14,39,0.72)] text-[#ddd8ff]"
                      : "border-white/12 bg-black/55 text-white/80"
                  }`}
                  title={`Made with ${aiToolLabel}`}
                >
                  Made with {aiToolLabel}
                </span>
              ) : null}

              <div className="absolute bottom-2 left-2">
                <VideoWatchingNowBadge videoId={video.id} />
              </div>

              {/* Progress bar */}
              {progress != null && progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div
                    className={`h-full ${isWatchVariant ? "bg-[#00e87b]" : "bg-[#7F77DD]"}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 px-4 pb-3 pt-4">
            <CreatorHoverCard creatorId={video.creator_id} className="shrink-0">
              {video.creator_avatar ? (
                <Image
                  src={video.creator_avatar}
                  alt={video.creator_name}
                  width={36}
                  height={36}
                  className={`h-9 w-9 rounded-[0.8rem] object-cover transition-all duration-200 hover:ring-2 ${
                    isWatchVariant ? "hover:ring-[#5DCAA5]/28" : "hover:ring-text-primary/15"
                  }`}
                />
              ) : (
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-[0.8rem] text-sm font-medium text-text-secondary transition-all duration-200 hover:ring-2 ${
                    isWatchVariant
                      ? "bg-[#0d1b15] text-[#baf6d9] hover:ring-[#5DCAA5]/28"
                      : "bg-page/80 hover:ring-text-primary/15"
                  }`}
                >
                  {video.creator_name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </CreatorHoverCard>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 text-[1.02rem] font-semibold text-text-primary line-clamp-2 leading-snug transition-colors duration-150 group-hover:text-white">
                  {video.title}
                </h3>
              </div>
              <CreatorHoverCard creatorId={video.creator_id}>
                <p className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[13px] leading-tight text-text-secondary transition-colors duration-150 hover:text-text-primary">
                  {video.creator_name}
                </p>
              </CreatorHoverCard>
              {isUpcomingPremiere ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[#F59E0B]">
                    {getPremiereCountdownText(video.premiere_at!)}
                  </span>
                  <PremiereBookmark videoId={video.id} size="sm" />
                </div>
              ) : (
                <p className="mt-0.5 text-[12px] leading-tight text-text-tertiary">
                  {formatCount(video.view_count)} views
                  {video.published_at && <> · {timeAgo(video.published_at)}</>}
                </p>
              )}
            </div>
          </div>
        </Link>

        <div className="px-4 pb-4 pt-0">
          <div className="flex items-center justify-between gap-3">
            <VideoCardActions
              videoId={video.id}
              title={video.title}
              initialUpvotes={video.like_count ?? 0}
              initialComments={video.comment_count ?? 0}
              initialShares={video.share_count ?? 0}
            />
            {onHide ? (
              <VideoCardMenu
                videoId={video.id}
                creatorId={video.creator_id}
                creatorUsername={video.creator_username ?? ""}
                onHide={handleHide}
                className="shrink-0 pt-1"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
