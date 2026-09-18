import React from "react";
import { getLifecycleBadgeStatus, type LifecycleBadgeStatus } from "@/components/projects/lifecycle-visuals";
import type { ProjectLifecycleStatus } from "@/types/project";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "free" | "paid" | "subscription";
type BadgeStatus = LifecycleBadgeStatus;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  status?: BadgeStatus;
  lifecycle?: ProjectLifecycleStatus;
  tone?: "default" | "glass";
}

const STATUS_CLASS_MAP: Record<BadgeStatus, string> = {
  neutral: "border-role-border-default bg-transparent text-role-fg-secondary",
  info: "border-role-border-strong bg-transparent text-role-fg-primary",
  success: "border-role-success-border bg-transparent text-role-success-fg",
  warning: "border-role-warning-border bg-transparent text-role-warning-fg",
  danger: "border-role-danger-border bg-transparent text-role-danger-fg",
};

const VARIANT_CLASS_MAP: Record<BadgeVariant, string> = {
  default: STATUS_CLASS_MAP.neutral,
  free: "border-role-border-subtle bg-transparent text-role-fg-secondary",
  paid: "border-role-border-default bg-transparent text-role-fg-primary",
  subscription: "border-role-success-border bg-transparent text-role-success-fg",
};

export function Badge({ className, variant = "default", status, lifecycle, tone = "default", children, ...props }: BadgeProps) {
  const resolvedStatus = lifecycle ? getLifecycleBadgeStatus(lifecycle) : status;
  const colorClass = resolvedStatus ? STATUS_CLASS_MAP[resolvedStatus] : VARIANT_CLASS_MAP[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] transition-colors duration-150",
        tone === "glass" && "bg-role-bg-overlay-soft backdrop-blur-sm",
        colorClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
