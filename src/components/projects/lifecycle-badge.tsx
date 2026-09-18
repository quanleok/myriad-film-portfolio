import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectLifecycleStatus } from "@/types/project";
import { getLifecycleVisual } from "./lifecycle-visuals";

interface LifecycleBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: ProjectLifecycleStatus;
  showDot?: boolean;
}

export function LifecycleBadge({ className, status, showDot = false, ...props }: LifecycleBadgeProps) {
  const visual = getLifecycleVisual(status);

  return (
    <Badge
      className={cn("gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]", visual.badgeClassName, className)}
      {...props}
    >
      {showDot ? <span className={cn("h-1.5 w-1.5 rounded-full", visual.dotClassName)} aria-hidden="true" /> : null}
      {visual.label}
    </Badge>
  );
}
