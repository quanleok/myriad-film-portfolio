"use client";

import { cn } from "@/lib/utils";
import {
  getCreatorTrustBadgeLabel,
  type CreatorTrustBadgeKey,
  type CreatorTrustState,
} from "@/lib/creator-trust";

const BADGE_STYLES: Record<CreatorTrustBadgeKey, string> = {
  founding_member:
    "border-white/20 bg-white/[0.06] text-text-primary dark:border-white/15 dark:bg-white/[0.08] dark:text-white/90",
  verified_delivery:
    "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};

interface CreatorTrustBadgesProps {
  trust: CreatorTrustState;
  className?: string;
  badgeClassName?: string;
  size?: "sm" | "md";
}

export function CreatorTrustBadges({
  trust,
  className,
  badgeClassName,
  size = "sm",
}: CreatorTrustBadgesProps) {
  if (trust.badges.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {trust.badges.slice(0, 2).map((badge) => (
        <span
          key={badge}
          className={cn(
            "inline-flex items-center rounded-full border font-medium",
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
            BADGE_STYLES[badge],
            badgeClassName
          )}
        >
          {getCreatorTrustBadgeLabel(badge)}
        </span>
      ))}
    </div>
  );
}
