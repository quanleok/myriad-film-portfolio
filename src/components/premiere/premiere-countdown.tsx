"use client";

import { useEffect, useMemo, useState } from "react";
import { PremiereBookmark } from "./PremiereBookmark";

interface PremiereCountdownProps {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  premiereAt: string;
  creatorName: string;
  creatorAvatar: string | null;
  starLevel?: number | null;
  onPremiereStart: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

const STAR_DISPLAY: Record<number, string> = {
  0: "☆",
  1: "★",
  2: "★★",
  3: "★★★",
};

export function PremiereCountdown({
  videoId,
  title,
  thumbnailUrl,
  premiereAt,
  creatorName,
  creatorAvatar,
  starLevel,
  onPremiereStart,
}: PremiereCountdownProps) {
  const target = useMemo(() => new Date(premiereAt), [premiereAt]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calcTimeLeft(target));
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = calcTimeLeft(target);
      if (!tl) {
        clearInterval(interval);
        setStarting(true);
        // Brief "Starting now" delay, then trigger
        setTimeout(() => onPremiereStart(), 2000);
        return;
      }
      setTimeLeft(tl);
    }, 1000);
    return () => clearInterval(interval);
  }, [target, onPremiereStart]);

  if (starting) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover blur-md opacity-30"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <p className="text-2xl font-bold text-[#F59E0B]">Starting now...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      {/* Blurred thumbnail background */}
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover blur-lg opacity-20 scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40" />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        {/* Premiere badge */}
        <span className="mb-4 rounded bg-[#F59E0B] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-black">
          Premiere
        </span>

        {/* Title */}
        <h1 className="max-w-2xl font-display text-2xl font-bold text-white md:text-3xl lg:text-4xl">
          {title}
        </h1>

        {/* Creator */}
        <div className="mt-3 flex items-center gap-2">
          {creatorAvatar ? (
            <img
              src={creatorAvatar}
              alt={creatorName}
              className="h-7 w-7 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-medium text-page">
              {creatorName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-sm text-white/80">{creatorName}</span>
          {starLevel != null && starLevel > 0 && (
            <span className="text-xs text-[#F59E0B]">
              {STAR_DISPLAY[starLevel] ?? "★"}
            </span>
          )}
        </div>

        {/* Countdown timer */}
        {timeLeft && (
          <div className="mt-6 flex gap-3">
            {timeLeft.days > 0 && (
              <CountdownUnit value={timeLeft.days} label="Days" />
            )}
            <CountdownUnit value={timeLeft.hours} label="Hours" />
            <CountdownUnit value={timeLeft.minutes} label="Min" />
            <CountdownUnit value={timeLeft.seconds} label="Sec" />
          </div>
        )}

        {/* Bookmark button */}
        <PremiereBookmark videoId={videoId} className="mt-6" />
      </div>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface border border-border md:h-20 md:w-20">
        <span className="font-mono text-3xl font-bold text-text-primary md:text-4xl">
          {pad(value)}
        </span>
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
    </div>
  );
}
