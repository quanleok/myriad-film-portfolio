"use client";

import { useEffect, useState } from "react";
import type { ReactionEmoji } from "@/lib/reactions";

interface FloatingReaction {
  id: string;
  emoji: ReactionEmoji;
  offsetX: number;
  delay: number;
}

export function FloatingReactionsOverlay() {
  const [items, setItems] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    function onReaction(event: Event) {
      const customEvent = event as CustomEvent<{ emoji?: ReactionEmoji }>;
      const emoji = customEvent.detail?.emoji;
      if (!emoji) return;

      const next: FloatingReaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        emoji,
        offsetX: Math.round((Math.random() - 0.5) * 42),
        delay: Math.random() * 0.12,
      };

      setItems((prev) => [...prev, next]);

      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== next.id));
      }, 1500);
    }

    window.addEventListener("myriad:floating-reaction", onReaction as EventListener);
    return () => {
      window.removeEventListener("myriad:floating-reaction", onReaction as EventListener);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          className="absolute bottom-6 right-6 text-3xl animate-floating-reaction"
          style={{
            transform: `translateX(${item.offsetX}px)`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
