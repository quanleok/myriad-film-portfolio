"use client";

import { cn } from "@/lib/utils";
import {
  FORUM_CATEGORIES,
  type ForumCategory,
  type ForumSort,
} from "@/lib/forum";

interface ForumSidebarProps {
  counts: Record<ForumCategory, number>;
  category: ForumCategory | "all";
  onCategoryChange: (value: ForumCategory | "all") => void;
  sort: ForumSort;
  onSortChange: (value: ForumSort) => void;
}

const SORT_OPTIONS: Array<{ value: ForumSort; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
  { value: "liked", label: "Most liked" },
];

export function ForumSidebar({
  counts,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: ForumSidebarProps) {
  return (
    <aside className="space-y-8 rounded-[1.8rem] border border-white/8 bg-[rgba(10,12,17,0.9)] p-5 shadow-[0_22px_48px_rgba(0,0,0,0.24)]">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ddfcb]">
          Categories
        </p>
        <div className="mt-4 space-y-1.5">
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            className={cn(
              "flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-sm transition-colors",
              category === "all"
                ? "bg-[rgba(0,232,123,0.14)] text-white"
                : "text-text-secondary hover:bg-white/4 hover:text-text-primary"
            )}
          >
            <span>All threads</span>
            <span className="text-xs text-text-tertiary">
              {Object.values(counts).reduce((sum, count) => sum + count, 0)}
            </span>
          </button>
          {FORUM_CATEGORIES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onCategoryChange(item.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-sm transition-colors",
                category === item.value
                  ? "bg-[rgba(127,119,221,0.16)] text-white"
                  : "text-text-secondary hover:bg-white/4 hover:text-text-primary"
              )}
            >
              <span>{item.label}</span>
              <span className="text-xs text-text-tertiary">{counts[item.value]}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ddfcb]">
          Sort
        </p>
        <div className="mt-4 space-y-1.5">
          {SORT_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onSortChange(item.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-sm transition-colors",
                sort === item.value
                  ? "bg-[rgba(245,185,74,0.14)] text-white"
                  : "text-text-secondary hover:bg-white/4 hover:text-text-primary"
              )}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

