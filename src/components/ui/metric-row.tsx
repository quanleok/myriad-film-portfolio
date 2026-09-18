import React from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type MetricTone = "default" | "success" | "warning" | "danger";

interface MetricRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: MetricTone;
}

const VALUE_TONE_CLASS: Record<MetricTone, string> = {
  default: "text-role-fg-primary",
  success: "text-role-success-fg",
  warning: "text-role-warning-fg",
  danger: "text-role-danger-fg",
};

export function MetricRow({ className, label, value, hint, tone = "default", ...props }: MetricRowProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-2", className)} {...props}>
      <div className="min-w-0">
        <p className="truncate text-sm text-role-fg-secondary">{label}</p>
        {hint ? <p className="mt-1 text-xs text-role-fg-tertiary">{hint}</p> : null}
      </div>
      <p className={cn("shrink-0 text-sm font-semibold", VALUE_TONE_CLASS[tone])}>{value}</p>
    </div>
  );
}
