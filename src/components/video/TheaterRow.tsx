"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TuneInButton } from "@/components/premiere/TuneInButton";

const LiveChatSidebar = dynamic(() => import("./LiveChatSidebar").then((m) => m.LiveChatSidebar), { ssr: false });

interface TheaterRowProps {
  videoId: string;
  creatorId: string;
  isPremiere: boolean;
  premiereAt?: string | null;
  premiereEnded?: boolean;
  title?: string;
  thumbnailUrl?: string | null;
  creatorName?: string;
  creatorAvatar?: string | null;
  children: React.ReactNode;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function calcTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function TheaterRow({
  videoId,
  creatorId,
  isPremiere,
  premiereAt,
  premiereEnded: initialPremiereEnded = false,
  title,
  thumbnailUrl,
  creatorName,
  creatorAvatar,
  children,
}: TheaterRowProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoHeight, setVideoHeight] = useState(0);

  // Premiere state
  const hasStarted = initialPremiereEnded || (premiereAt ? new Date() >= new Date(premiereAt) : true);
  const [premiereStarted, setPremiereStarted] = useState(hasStarted);
  const [isLive, setIsLive] = useState(isPremiere && hasStarted && !initialPremiereEnded);
  const [timeLeft, setTimeLeft] = useState(() =>
    isPremiere && premiereAt && !hasStarted ? calcTimeLeft(new Date(premiereAt)) : null
  );
  const [starting, setStarting] = useState(false);

  const chatWidth = 420;
  const showCountdown = isPremiere && !premiereStarted && !starting;
  const showPlayer = !isPremiere || premiereStarted;
  const showDesktopChat = isPremiere;

  // Countdown timer
  useEffect(() => {
    if (!isPremiere || !premiereAt || premiereStarted) return;

    const target = new Date(premiereAt);
    const interval = setInterval(() => {
      const tl = calcTimeLeft(target);
      if (!tl) {
        clearInterval(interval);
        setStarting(true);

        // Notify tuned-in users
        fetch("/api/premiere-reminders/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        }).catch(() => {});

        setTimeout(() => {
          setPremiereStarted(true);
          setIsLive(true);
          setStarting(false);
        }, 2000);
        return;
      }
      setTimeLeft(tl);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPremiere, premiereAt, premiereStarted, videoId]);

  // Height sync
  const updateHeight = useCallback(() => {
    if (videoContainerRef.current) {
      setVideoHeight(videoContainerRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    updateHeight();
    const el = videoContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateHeight]);

  // Countdown overlay
  const countdownContent = (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={title ?? ""}
          className="absolute inset-0 h-full w-full object-cover blur-lg opacity-20 scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="mb-4 rounded bg-[#F59E0B] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-black">
          Premiere
        </span>

        <h2 className="max-w-2xl text-2xl font-bold text-white md:text-3xl lg:text-4xl">
          {title}
        </h2>

        <div className="mt-3 flex items-center gap-2">
          {creatorAvatar ? (
            <img src={creatorAvatar} alt={creatorName ?? ""} className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-medium text-page">
              {creatorName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-sm text-white/80">{creatorName}</span>
        </div>

        {starting ? (
          <div className="mt-6 animate-pulse">
            <p className="text-2xl font-bold text-[#F59E0B]">Starting now...</p>
          </div>
        ) : timeLeft ? (
          <>
            <div className="mt-6 flex gap-3">
              {timeLeft.days > 0 && (
                <div className="flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface border border-border md:h-20 md:w-20">
                    <span className="font-mono text-3xl font-bold text-text-primary md:text-4xl">{pad(timeLeft.days)}</span>
                  </div>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">Days</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface border border-border md:h-20 md:w-20">
                  <span className="font-mono text-3xl font-bold text-text-primary md:text-4xl">{pad(timeLeft.hours)}</span>
                </div>
                <span className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">Hours</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface border border-border md:h-20 md:w-20">
                  <span className="font-mono text-3xl font-bold text-text-primary md:text-4xl">{pad(timeLeft.minutes)}</span>
                </div>
                <span className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">Min</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface border border-border md:h-20 md:w-20">
                  <span className="font-mono text-3xl font-bold text-text-primary md:text-4xl">{pad(timeLeft.seconds)}</span>
                </div>
                <span className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">Sec</span>
              </div>
            </div>

            <TuneInButton videoId={videoId} className="mt-6" />
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-black">
      {/* Desktop: full-width player for clips, split layout only for premieres */}
      {showDesktopChat ? (
        <div className="hidden lg:flex">
          <div
            ref={videoContainerRef}
            className="relative flex-1 min-w-0 overflow-hidden"
          >
            {showCountdown && countdownContent}
            {showPlayer && (
              <div className="relative">
                {children}
                {isLive && (
                  <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-white">
                      Live Premiere
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className="shrink-0 border-l-2 border-brand-500"
            style={{
              width: `${chatWidth}px`,
              height: videoHeight > 0 ? `${videoHeight}px` : undefined,
            }}
          >
            <ErrorBoundary>
              <LiveChatSidebar
                videoId={videoId}
                creatorId={creatorId}
                forceOpen
              />
            </ErrorBoundary>
          </div>
        </div>
      ) : (
        <div
          ref={videoContainerRef}
          className="relative hidden overflow-hidden lg:block"
        >
          {children}
        </div>
      )}

      {/* Mobile: video/countdown only */}
      <div className="lg:hidden">
        {showCountdown && countdownContent}
        {showPlayer && (
          <div className="relative">
            {children}
            {isLive && (
              <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Live Premiere
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
