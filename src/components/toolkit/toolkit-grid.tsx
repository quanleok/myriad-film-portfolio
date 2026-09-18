"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  filterToolkitApps,
  getToolkitCategoriesWithCounts,
  TOOLKIT_CATEGORY_LABELS,
  type ToolApp,
  type ToolkitCategory,
  type ToolkitQuickFilter,
} from "@/lib/toolkit";
import { ToolkitCard } from "@/components/toolkit/toolkit-card";

interface ToolkitGridProps {
  tools: ToolApp[];
  initialQuery: string;
  initialCategory: ToolkitCategory | "all";
  initialQuickFilter: ToolkitQuickFilter | null;
}

const QUICK_FILTER_OPTIONS: Array<{
  key: ToolkitQuickFilter;
  label: string;
  hint: string;
}> = [
  { key: "popular", label: "Popular", hint: "Most used" },
  { key: "new", label: "New", hint: "Fresh drops" },
  { key: "ai-powered", label: "AI-powered", hint: "Anthropic-assisted" },
];

export function ToolkitGrid({
  tools,
  initialQuery,
  initialCategory,
  initialQuickFilter,
}: ToolkitGridProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<ToolkitCategory | "all">(initialCategory);
  const [quickFilter, setQuickFilter] = useState<ToolkitQuickFilter | null>(initialQuickFilter);

  const categoryCounts = useMemo(() => getToolkitCategoriesWithCounts(tools), [tools]);
  const filteredTools = useMemo(
    () =>
      filterToolkitApps({
        tools,
        query,
        category,
        quickFilter,
      }),
    [category, query, quickFilter, tools]
  );

  const syncUrl = useCallback(
    (nextQuery: string, nextCategory: ToolkitCategory | "all", nextQuickFilter: ToolkitQuickFilter | null) => {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextCategory !== "all") params.set("category", nextCategory);
      if (nextQuickFilter) params.set("filter", nextQuickFilter);
      const serialized = params.toString();
      router.replace(serialized ? `/toolkit?${serialized}` : "/toolkit", { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncUrl(query, category, quickFilter);
  }, [category, query, quickFilter, syncUrl]);

  const headerTitle =
    category === "all"
      ? "All tools"
      : TOOLKIT_CATEGORY_LABELS[category];

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(131,92,255,0.18),rgba(12,12,20,0.92)_38%,rgba(7,17,12,0.96)_100%)]">
        <VideoHubHeader activeTab="toolkit" hidePrimary />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-5 rounded-[1.7rem] border border-[rgba(131,92,255,0.16)] bg-[linear-gradient(180deg,rgba(17,15,30,0.94),rgba(9,11,15,0.96))] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.26)]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bcaeff]" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tools"
                    className="h-11 rounded-full border-[rgba(131,92,255,0.16)] bg-[rgba(14,12,26,0.9)] pl-10 text-text-primary placeholder:text-text-tertiary focus:border-[rgba(151,114,255,0.42)] focus:bg-[rgba(20,17,34,0.95)] focus:ring-[rgba(131,92,255,0.24)]"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Categories
                  </p>
                  <div className="space-y-1.5">
                    {categoryCounts.map((entry) => {
                      const active = category === entry.key;
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => setCategory(entry.key)}
                          className={cn(
                            "press-effect flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-[rgba(131,92,255,0.22)] text-[#f3efff] shadow-[inset_0_0_0_1px_rgba(151,114,255,0.24)]"
                              : "text-text-secondary hover:bg-[rgba(23,20,34,0.82)] hover:text-text-primary"
                          )}
                        >
                          <span>{entry.label}</span>
                          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] text-text-tertiary">
                            {entry.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-white/8" />

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Quick filters
                  </p>
                  <div className="space-y-2">
                    {QUICK_FILTER_OPTIONS.map((option) => {
                      const active = quickFilter === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setQuickFilter((current) => (current === option.key ? null : option.key))}
                          className={cn(
                            "press-effect flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition-all duration-200",
                            active
                              ? "bg-[rgba(255,61,210,0.14)] text-[#fff0fb] shadow-[inset_0_0_0_1px_rgba(255,61,210,0.18)]"
                              : "text-text-secondary hover:bg-[rgba(23,20,34,0.82)] hover:text-text-primary"
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="mt-1 text-xs text-text-tertiary">{option.hint}</p>
                          </div>
                          {option.key === "ai-powered" ? (
                            <Sparkles className="mt-0.5 h-4 w-4 text-[#ff8de5]" />
                          ) : option.key === "popular" ? (
                            <Wand2 className="mt-0.5 h-4 w-4 text-[#bcaeff]" />
                          ) : (
                            <span className="mt-0.5 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                              New
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>

            <div className="space-y-6">
              <section className="space-y-5 rounded-[1.9rem] border border-[rgba(131,92,255,0.12)] bg-[linear-gradient(180deg,rgba(19,15,31,0.92),rgba(10,11,16,0.96))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c8bbff]">
                      Toolkit
                    </p>
                    <h1 className="font-display text-[1.95rem] font-semibold tracking-[-0.06em] text-text-primary sm:text-[2.25rem]">
                      Free creator tools
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-text-secondary">
                      Utility-first apps for prompt building, character continuity, and clean exports. Toolkit is the purple workshop surface inside Myriad Spring.
                    </p>
                  </div>
                  <div className="rounded-full border border-[rgba(131,92,255,0.16)] bg-black/18 px-4 py-2 text-sm font-medium text-text-secondary">
                    {filteredTools.length} {filteredTools.length === 1 ? "tool" : "tools"}
                  </div>
                </div>

                <div className="space-y-4 lg:hidden">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bcaeff]" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search tools"
                      className="h-11 rounded-full border-[rgba(131,92,255,0.16)] bg-[rgba(14,12,26,0.9)] pl-10 text-text-primary placeholder:text-text-tertiary focus:border-[rgba(151,114,255,0.42)] focus:bg-[rgba(20,17,34,0.95)] focus:ring-[rgba(131,92,255,0.24)]"
                    />
                  </div>

                  <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                    {categoryCounts.map((entry) => {
                      const active = category === entry.key;
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => setCategory(entry.key)}
                          className={cn(
                            "press-effect shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-[rgba(131,92,255,0.24)] text-[#f3efff] shadow-[inset_0_0_0_1px_rgba(151,114,255,0.24)]"
                              : "border border-white/8 bg-[rgba(17,15,28,0.88)] text-text-secondary"
                          )}
                        >
                          {entry.label} <span className="text-text-tertiary">· {entry.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                    {QUICK_FILTER_OPTIONS.map((option) => {
                      const active = quickFilter === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setQuickFilter((current) => (current === option.key ? null : option.key))}
                          className={cn(
                            "press-effect shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-[rgba(255,61,210,0.16)] text-[#fff0fb] shadow-[inset_0_0_0_1px_rgba(255,61,210,0.18)]"
                              : "border border-white/8 bg-[rgba(17,15,28,0.88)] text-text-secondary"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
                    {headerTitle}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Use the sidebar on desktop or the mobile pills to move between creator workflows.
                  </p>
                </div>
                <p className="text-sm font-medium text-text-tertiary">
                  {filteredTools.length} matching
                </p>
              </div>

              {filteredTools.length ? (
                <div className="stagger-up grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredTools.map((tool) => (
                    <ToolkitCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.7rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(12,11,18,0.92)] px-6 py-10 text-center shadow-[0_18px_42px_rgba(0,0,0,0.24)]">
                  <p className="text-lg font-semibold text-text-primary">No tools match that search yet.</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Clear the query or switch back to all tools to browse the starter set.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
