import React from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type RailTone = "default" | "success" | "warning" | "danger";

interface ActionRailButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
  tone?: RailTone;
}

const TONE_CLASS_MAP: Record<RailTone, string> = {
  default: "border-role-border-subtle bg-role-bg-surface text-role-fg-primary hover:border-role-border-strong hover:bg-role-bg-surface-hover hover:shadow-[0_0_20px_rgba(0,232,123,0.1)]",
  success: "border-role-success-border bg-role-success-bg text-role-success-fg hover:brightness-105",
  warning: "border-role-warning-border bg-role-warning-bg text-role-warning-fg hover:brightness-105",
  danger: "border-role-danger-border bg-role-danger-bg text-role-danger-fg hover:brightness-105",
};

export function ActionRailButton({
  className,
  label,
  description,
  icon,
  trailing,
  active = false,
  tone = "default",
  type = "button",
  ...props
}: ActionRailButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all",
        TONE_CLASS_MAP[tone],
        active && "border-role-border-strong bg-role-bg-surface-active shadow-[0_0_0_1px_rgba(0,232,123,0.24)]",
        className
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon ? <span className="shrink-0 text-role-fg-secondary group-hover:text-brand-300">{icon}</span> : null}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{label}</span>
          {description ? <span className="block truncate text-xs text-role-fg-tertiary">{description}</span> : null}
        </span>
      </span>
      {trailing ? <span className="shrink-0 text-role-fg-tertiary">{trailing}</span> : null}
    </button>
  );
}
