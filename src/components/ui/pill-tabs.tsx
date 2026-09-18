import React from "react";
import { cn } from "@/lib/utils";

export interface PillTabItem {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface PillTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: PillTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  tone?: "default" | "glass";
  activeClassName?: string;
}

export function PillTabs({ className, tabs, value, onValueChange, tone = "default", activeClassName, ...props }: PillTabsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap sm:overflow-visible", className)} role="tablist" {...props}>
      {tabs.map((tab) => {
        const active = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              tone === "glass" && "backdrop-blur-sm",
              active
                ? activeClassName ?? "border-brand-500 bg-brand-600/14 text-brand-300 shadow-[0_0_0_1px_rgba(0,232,123,0.24)]"
                : "border-role-border-default bg-role-bg-surface text-role-fg-secondary hover:border-role-border-strong hover:bg-role-bg-surface-hover hover:text-role-fg-primary"
            )}
            onClick={() => onValueChange(tab.value)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span className="rounded-full bg-role-bg-subtle px-1.5 py-0.5 text-[11px] leading-none text-role-fg-secondary">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
