"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  creatorId: string;
  initialFollowing?: boolean;
}

const BURST_DOTS = [
  { x: -14, y: -10, color: "#FFFFFF" },
  { x: -4, y: -14, color: "#22C55E" },
  { x: 8, y: -12, color: "#F59E0B" },
  { x: 14, y: -4, color: "#EC4899" },
  { x: -12, y: 2, color: "#60A5FA" },
];

export function FollowButton({
  creatorId,
  initialFollowing,
}: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(initialFollowing !== undefined);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (!showBurst) return;
    const timeout = window.setTimeout(() => setShowBurst(false), 420);
    return () => window.clearTimeout(timeout);
  }, [showBurst]);

  // If initialFollowing not provided, fetch status
  useEffect(() => {
    if (!user || initialFollowing !== undefined) return;
    fetch(`/api/follows?creatorId=${creatorId}`)
      .then((r) => r.json())
      .then((json) => {
        setFollowing(json.following ?? false);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user, creatorId, initialFollowing]);

  // Don't show follow button for own profile
  if (user?.id === creatorId) return null;
  if (!loaded) return null;

  async function toggle() {
    if (!user || submitting) return;
    setSubmitting(true);

    const wasFollowing = following;
    const nextFollowing = !wasFollowing;
    setFollowing(nextFollowing);

    if (!wasFollowing) {
      setShowBurst(true);
    }

    const res = await fetch("/api/follows", {
      method: wasFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });

    if (!res.ok) {
      setFollowing(wasFollowing);
      setShowBurst(false);
    }

    setSubmitting(false);
  }

  if (!user) {
    return (
      <a href="/login">
        <Button variant="secondary" size="sm">
          Follow
        </Button>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={submitting}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
        following
          ? "bg-text-primary text-page shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
          : "border border-border bg-transparent text-text-primary hover:border-text-secondary hover:text-text-primary"
      } ${submitting ? "opacity-70" : ""}`}
    >
      {following ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path className="animate-check-draw" d="M5 12.5l4.2 4.2L19 7" />
        </svg>
      ) : null}
      <span>{following ? "Following" : "Follow"}</span>

      {showBurst ? (
        <span className="pointer-events-none absolute inset-0">
          {BURST_DOTS.map((dot, index) => (
            <span
              key={`follow-dot-${index}`}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full animate-follow-burst"
              style={
                {
                  "--burst-x": `${dot.x}px`,
                  "--burst-y": `${dot.y}px`,
                  backgroundColor: dot.color,
                  animationDelay: `${index * 0.03}s`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      ) : null}
    </button>
  );
}
