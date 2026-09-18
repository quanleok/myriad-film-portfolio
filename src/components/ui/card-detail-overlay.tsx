"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface CardDetailOverlayProps {
  open: boolean;
  onClose: () => void;
  mediaUrl: string | null;
  mediaType: "image" | "video";
  title: string | null;
  description: string | null;
}

export function CardDetailOverlay({
  open,
  onClose,
  mediaUrl,
  mediaType,
  title,
  description,
}: CardDetailOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef(0);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    dragCurrentY.current = Math.max(0, delta);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dragCurrentY.current}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragCurrentY.current > 100) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        type="button"
        className={`absolute inset-0 bg-black transition-opacity duration-[250ms] ${
          animating ? "opacity-60" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="Close overlay"
      />

      <div
        ref={sheetRef}
        className={`relative w-full max-w-lg rounded-t-2xl bg-page transition-transform duration-[250ms] ease-out ${
          animating ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85dvh" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-text-tertiary/40" />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-secondary hover:text-text-primary"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div
          className="overflow-y-auto pb-[env(safe-area-inset-bottom)] scrollbar-none"
          style={{ maxHeight: "calc(85dvh - 24px)" }}
        >
          {mediaUrl ? (
            mediaType === "video" ? (
              <video
                src={mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />
            ) : (
              <img
                src={mediaUrl}
                alt={title ?? "Card detail"}
                className="aspect-video w-full object-cover"
              />
            )
          ) : (
            <div className="aspect-video w-full bg-surface" />
          )}

          <div className="space-y-2 p-4">
            {title ? (
              <h3 className="text-lg font-bold text-text-primary">{title}</h3>
            ) : null}
            {description ? (
              <p className="text-sm leading-relaxed text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
