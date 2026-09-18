"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pause, Play, Volume2, VolumeX, Maximize } from "lucide-react";

interface TeaserPlayerProps {
  src: string | null;
  poster?: string | null;
  /** Fill container (object-cover) vs fit within (object-contain) */
  fit?: "cover" | "contain";
  /** Start muted (default true for autoplay compliance) */
  defaultMuted?: boolean;
  /** Autoplay when visible */
  autoPlay?: boolean;
  /** Loop the video */
  loop?: boolean;
  /** Additional className on the root div */
  className?: string;
  /** Called when muted state changes */
  onMutedChange?: (muted: boolean) => void;
}

export interface TeaserPlayerHandle {
  play: () => void;
  pause: () => void;
  getVideo: () => HTMLVideoElement | null;
}

export const TeaserPlayer = forwardRef<TeaserPlayerHandle, TeaserPlayerProps>(
  function TeaserPlayer(
    {
      src,
      poster,
      fit = "cover",
      defaultMuted = true,
      autoPlay = true,
      loop = true,
      className = "",
      onMutedChange,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(defaultMuted);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [seeking, setSeeking] = useState(false);

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play().catch(() => undefined),
      pause: () => videoRef.current?.pause(),
      getVideo: () => videoRef.current,
    }));

    // Auto-hide controls
    const resetHideTimer = useCallback(() => {
      setShowControls(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (!seeking) setShowControls(false);
      }, 3000);
    }, [seeking]);

    useEffect(() => {
      return () => clearTimeout(hideTimerRef.current);
    }, []);

    // Sync muted state to video element
    useEffect(() => {
      if (videoRef.current) videoRef.current.muted = muted;
      onMutedChange?.(muted);
    }, [muted, onMutedChange]);

    const togglePlay = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play().catch(() => undefined);
      } else {
        v.pause();
      }
      resetHideTimer();
    }, [resetHideTimer]);

    const toggleMute = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setMuted((prev) => !prev);
        resetHideTimer();
      },
      [resetHideTimer]
    );

    const handleTimeUpdate = useCallback(() => {
      const v = videoRef.current;
      if (v && !seeking) setCurrentTime(v.currentTime);
    }, [seeking]);

    const handleLoadedMetadata = useCallback(() => {
      const v = videoRef.current;
      if (v) setDuration(v.duration);
    }, []);

    // Seek on progress bar click/drag
    const seekTo = useCallback((clientX: number) => {
      const bar = progressRef.current;
      const v = videoRef.current;
      if (!bar || !v || !v.duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      v.currentTime = ratio * v.duration;
      setCurrentTime(v.currentTime);
    }, []);

    const handleProgressMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setSeeking(true);
        seekTo(e.clientX);

        function onMove(ev: MouseEvent) {
          seekTo(ev.clientX);
        }
        function onUp(ev: MouseEvent) {
          seekTo(ev.clientX);
          setSeeking(false);
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      },
      [seekTo]
    );

    const handleProgressTouchStart = useCallback(
      (e: React.TouchEvent) => {
        e.stopPropagation();
        setSeeking(true);
        seekTo(e.touches[0].clientX);
      },
      [seekTo]
    );

    const handleProgressTouchMove = useCallback(
      (e: React.TouchEvent) => {
        seekTo(e.touches[0].clientX);
      },
      [seekTo]
    );

    const handleProgressTouchEnd = useCallback(() => {
      setSeeking(false);
    }, []);

    const handleFullscreen = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      const v = videoRef.current;
      if (!v) return;
      if (v.requestFullscreen) {
        v.requestFullscreen().catch(() => undefined);
      } else if ((v as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
        (v as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    }, []);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    function formatTime(secs: number): string {
      if (!Number.isFinite(secs) || secs < 0) return "0:00";
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    }

    if (!src) {
      return poster ? (
        <img
          src={poster}
          alt=""
          className={`h-full w-full object-${fit} ${className}`}
        />
      ) : (
        <div
          className={`h-full w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black ${className}`}
        />
      );
    }

    return (
      <div
        ref={containerRef}
        className={`group/player relative h-full w-full bg-black ${className}`}
        onMouseMove={resetHideTimer}
        onMouseEnter={resetHideTimer}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          loop={loop}
          playsInline
          muted={muted}
          autoPlay={autoPlay}
          className={`absolute inset-0 h-full w-full ${
            fit === "cover" ? "object-cover" : "object-contain"
          }`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => { setPlaying(true); resetHideTimer(); }}
          onPause={() => setPlaying(false)}
        />

        {/* Center play button (shown when paused or controls visible) */}
        {!playing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-110">
              <Play size={28} className="ml-1" />
            </div>
          </div>
        )}

        {/* Bottom controls bar */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
            showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Progress bar */}
          <div className="relative px-3 pt-6 pb-1">
            <div
              ref={progressRef}
              className="group/bar relative h-1 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-1.5"
              onMouseDown={handleProgressMouseDown}
              onTouchStart={handleProgressTouchStart}
              onTouchMove={handleProgressTouchMove}
              onTouchEnd={handleProgressTouchEnd}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
              {/* Seek thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white opacity-0 transition-opacity group-hover/bar:opacity-100"
                style={{ left: `${progress}%`, marginLeft: "-6px" }}
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="relative flex items-center gap-2 px-3 pb-3 pt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <span className="text-xs text-white/70 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button
              type="button"
              onClick={handleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
              aria-label="Fullscreen"
            >
              <Maximize size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }
);
