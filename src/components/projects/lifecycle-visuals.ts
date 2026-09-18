import type { ProjectLifecycleStatus } from "@/types/project";

export type LifecycleBadgeStatus = "neutral" | "info" | "success" | "warning" | "danger";

export interface LifecycleVisualConfig {
  label: string;
  badgeStatus: LifecycleBadgeStatus;
  badgeClassName: string;
  dotClassName: string;
}

export const PROJECT_LIFECYCLE_VISUALS: Record<ProjectLifecycleStatus, LifecycleVisualConfig> = {
  draft: {
    label: "Draft",
    badgeStatus: "neutral",
    badgeClassName: "border border-zinc-500/40 bg-transparent text-zinc-500 dark:text-zinc-400",
    dotClassName: "bg-zinc-400",
  },
  teaser: {
    label: "Teaser",
    badgeStatus: "neutral",
    badgeClassName: "border border-white/25 bg-transparent text-white/90 dark:text-white/80",
    dotClassName: "bg-white/85",
  },
  unlocking: {
    label: "Seed",
    badgeStatus: "info",
    badgeClassName: "border border-teal-400/40 bg-transparent text-teal-300 dark:text-teal-300",
    dotClassName: "bg-teal-400",
  },
  in_production: {
    label: "In Production",
    badgeStatus: "info",
    badgeClassName: "border border-purple-500/40 bg-transparent text-purple-600 dark:text-purple-400",
    dotClassName: "bg-purple-500",
  },
  premiering: {
    label: "Premiering",
    badgeStatus: "warning",
    badgeClassName: "border border-amber-500/40 bg-transparent text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  released: {
    label: "Released",
    badgeStatus: "success",
    badgeClassName: "border border-green-500/40 bg-transparent text-green-600 dark:text-green-400",
    dotClassName: "bg-green-500",
  },
  failed_to_unlock: {
    label: "Did Not Unlock",
    badgeStatus: "danger",
    badgeClassName: "border border-zinc-500/40 bg-transparent text-zinc-500 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
  cancelled: {
    label: "Cancelled",
    badgeStatus: "neutral",
    badgeClassName: "border border-zinc-500/40 bg-transparent text-zinc-500 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
};

export const PROJECT_STATUS_LABELS: Record<ProjectLifecycleStatus, string> = {
  draft: PROJECT_LIFECYCLE_VISUALS.draft.label,
  teaser: PROJECT_LIFECYCLE_VISUALS.teaser.label,
  unlocking: PROJECT_LIFECYCLE_VISUALS.unlocking.label,
  in_production: PROJECT_LIFECYCLE_VISUALS.in_production.label,
  premiering: PROJECT_LIFECYCLE_VISUALS.premiering.label,
  released: PROJECT_LIFECYCLE_VISUALS.released.label,
  failed_to_unlock: PROJECT_LIFECYCLE_VISUALS.failed_to_unlock.label,
  cancelled: PROJECT_LIFECYCLE_VISUALS.cancelled.label,
};

export function getLifecycleVisual(status: ProjectLifecycleStatus): LifecycleVisualConfig {
  return PROJECT_LIFECYCLE_VISUALS[status];
}

export function getLifecycleBadgeClassName(status: ProjectLifecycleStatus): string {
  return PROJECT_LIFECYCLE_VISUALS[status].badgeClassName;
}

export function getLifecycleBadgeStatus(status: ProjectLifecycleStatus): LifecycleBadgeStatus {
  return PROJECT_LIFECYCLE_VISUALS[status].badgeStatus;
}

/** Returns lifecycle-colored CTA button classes (bg, border, hover) */
export function getLifecycleCtaClassName(status: ProjectLifecycleStatus): string {
  const ctaMap: Record<ProjectLifecycleStatus, string> = {
    draft: "bg-zinc-600 text-white hover:bg-zinc-500",
    teaser: "border border-white/25 bg-white/8 text-white hover:bg-white/12 shadow-[0_0_12px_rgba(255,255,255,0.08)]",
    unlocking: "border border-teal-400/35 bg-teal-500/16 text-teal-50 hover:bg-teal-500/24 shadow-[0_0_12px_rgba(45,212,191,0.16)]",
    in_production: "border border-purple-500/40 bg-purple-500/20 text-purple-100 hover:bg-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
    premiering: "border border-amber-500/40 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    released: "border border-green-500/40 bg-green-500/20 text-green-100 hover:bg-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]",
    failed_to_unlock: "bg-zinc-700 text-zinc-300 hover:bg-zinc-600",
    cancelled: "bg-zinc-700 text-zinc-300 hover:bg-zinc-600",
  };
  return ctaMap[status];
}

/** Returns active tab pill classes colored by lifecycle status */
export function getLifecycleTabActiveClassName(status: ProjectLifecycleStatus): string {
  const tabMap: Record<ProjectLifecycleStatus, string> = {
    draft: "border-zinc-500 bg-zinc-500/14 text-zinc-300",
    teaser: "border-white/30 bg-white/8 text-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
    unlocking: "border-teal-400/45 bg-teal-500/12 text-teal-300 shadow-[0_0_0_1px_rgba(45,212,191,0.2)]",
    in_production: "border-purple-500 bg-purple-500/14 text-purple-400 shadow-[0_0_0_1px_rgba(168,85,247,0.24)]",
    premiering: "border-amber-500 bg-amber-500/14 text-amber-400 shadow-[0_0_0_1px_rgba(245,158,11,0.24)]",
    released: "border-green-500 bg-green-500/14 text-green-400 shadow-[0_0_0_1px_rgba(34,197,94,0.24)]",
    failed_to_unlock: "border-zinc-500 bg-zinc-500/14 text-zinc-400",
    cancelled: "border-zinc-500 bg-zinc-500/14 text-zinc-400",
  };
  return tabMap[status];
}

/** Returns Tailwind hover classes for card glow + border color based on lifecycle status */
export function getLifecycleHoverGlow(status: ProjectLifecycleStatus): string {
  const glowMap: Record<ProjectLifecycleStatus, string> = {
    draft: "",
    teaser: "hover:shadow-[0_0_24px_rgba(255,255,255,0.1)] hover:border-white/30",
    unlocking: "hover:shadow-[0_0_24px_rgba(45,212,191,0.18)] hover:border-teal-400/40",
    in_production: "hover:shadow-[0_0_24px_rgba(168,85,247,0.2)] hover:border-purple-500/40",
    premiering: "hover:shadow-[0_0_24px_rgba(245,158,11,0.2)] hover:border-amber-500/40",
    released: "hover:shadow-[0_0_24px_rgba(34,197,94,0.2)] hover:border-green-500/40",
    failed_to_unlock: "",
    cancelled: "",
  };
  return glowMap[status];
}

/** Returns lifecycle-colored text class for progress/stats text */
export function getLifecycleTextClassName(status: ProjectLifecycleStatus): string {
  const textMap: Record<ProjectLifecycleStatus, string> = {
    draft: "text-zinc-400",
    teaser: "text-white/85",
    unlocking: "text-teal-300",
    in_production: "text-purple-400",
    premiering: "text-amber-400",
    released: "text-green-400",
    failed_to_unlock: "text-zinc-400",
    cancelled: "text-zinc-400",
  };
  return textMap[status];
}
