"use client";

import { cn } from "@/lib/utils";
import {
  RESOURCE_CATEGORY_SHORT_LABELS,
  RESOURCE_QUICK_FILTERS,
  RESOURCE_SORT_LABELS,
  type ResourceCategory,
  type ResourceQuickFilter,
  type ResourceSort,
} from "@/lib/resources";

interface ResourceSidebarProps {
  counts: Record<ResourceCategory, number>;
  category: ResourceCategory | "all";
  onCategoryChange: (value: ResourceCategory | "all") => void;
  activeTag: string | null;
  tags: Array<{ tag: string; count: number }>;
  onTagChange: (value: string | null) => void;
  quickFilter: ResourceQuickFilter | null;
  onQuickFilterChange: (value: ResourceQuickFilter | null) => void;
  sort: ResourceSort;
  onSortChange: (value: ResourceSort) => void;
}

export function ResourceSidebar({
  counts,
  category,
  onCategoryChange,
  activeTag,
  tags,
  onTagChange,
  quickFilter,
  onQuickFilterChange,
  sort,
  onSortChange,
}: ResourceSidebarProps) {
  return (
    <aside className="space-y-8 rounded-[1.8rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,12,17,0.9)] p-5 shadow-[0_22px_48px_rgba(0,0,0,0.24)]">
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
            <span>All resources</span>
            <span className="text-xs text-text-tertiary">
              {Object.values(counts).reduce((sum, count) => sum + count, 0)}
            </span>
          </button>
          {Object.entries(RESOURCE_CATEGORY_SHORT_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onCategoryChange(key as ResourceCategory)}
              className={cn(
                "flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-sm transition-colors",
                category === key
                  ? "bg-[rgba(127,119,221,0.16)] text-white"
                  : "text-text-secondary hover:bg-white/4 hover:text-text-primary"
              )}
            >
              <span>{label}</span>
              <span className="text-xs text-text-tertiary">{counts[key as ResourceCategory]}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ddfcb]">
          Tags
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagChange(activeTag === tag ? null : tag)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all",
                activeTag === tag
                  ? "border-[rgba(0,232,123,0.34)] bg-[rgba(0,232,123,0.12)] text-[#dcfff0]"
                  : "border-white/8 bg-white/4 text-text-secondary hover:text-text-primary"
              )}
            >
              {tag} <span className="text-text-tertiary">({count})</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ddfcb]">
          Quick
        </p>
        <div className="mt-4 space-y-1.5">
          {RESOURCE_QUICK_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() =>
                onQuickFilterChange(quickFilter === option.key ? null : option.key)
              }
              className={cn(
                "flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-sm transition-colors",
                quickFilter === option.key
                  ? "bg-[rgba(78,213,255,0.14)] text-white"
                  : "text-text-secondary hover:bg-white/4 hover:text-text-primary"
              )}
            >
              <span>{option.label}</span>
              <span className="text-xs text-text-tertiary">{option.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9ddfcb]">
          Sort
        </p>
        <div className="mt-4 space-y-1.5">
          {Object.entries(RESOURCE_SORT_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onSortChange(key as ResourceSort)}
              className={cn(
                "flex w-full items-center justify-between rounded-[1rem] px-3 py-2 text-sm transition-colors",
                sort === key
                  ? "bg-[rgba(245,185,74,0.14)] text-white"
                  : "text-text-secondary hover:bg-white/4 hover:text-text-primary"
              )}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
