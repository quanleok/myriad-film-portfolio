"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceSidebar } from "@/components/resources/resource-sidebar";
import { cn } from "@/lib/utils";
import {
  filterAndSortResources,
  getPopularTags,
  getResourceCategoryCounts,
  RESOURCE_SORT_LABELS,
  type ResourceCategory,
  type ResourceQuickFilter,
  type ResourceSort,
  type ResourceSummary,
} from "@/lib/resources";

interface ResourceGridProps {
  resources: ResourceSummary[];
  initialQuery: string;
  initialCategory: ResourceCategory | "all";
  initialTag: string | null;
  initialSort: ResourceSort;
  initialQuickFilter: ResourceQuickFilter | null;
}

export function ResourceGrid({
  resources,
  initialQuery,
  initialCategory,
  initialTag,
  initialSort,
  initialQuickFilter,
}: ResourceGridProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<ResourceCategory | "all">(initialCategory);
  const [tag, setTag] = useState<string | null>(initialTag);
  const [sort, setSort] = useState<ResourceSort>(initialSort);
  const [quickFilter, setQuickFilter] = useState<ResourceQuickFilter | null>(initialQuickFilter);

  const filteredResources = useMemo(
    () =>
      filterAndSortResources({
        resources,
        query,
        category,
        tag,
        sort,
        quickFilter,
      }),
    [resources, query, category, tag, sort, quickFilter]
  );
  const counts = useMemo(() => getResourceCategoryCounts(resources), [resources]);
  const tags = useMemo(() => getPopularTags(resources), [resources]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    if (tag) params.set("tag", tag);
    if (sort !== "popular") params.set("sort", sort);
    if (quickFilter) params.set("filter", quickFilter);
    const next = params.toString();
    router.replace(next ? `/resources?${next}` : "/resources", { scroll: false });
  }, [query, category, tag, sort, quickFilter, router]);

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(78,213,255,0.18),rgba(17,16,28,0.94)_36%,rgba(7,17,12,0.98)_100%)]">
        <VideoHubHeader
          activeTab="resources"
          primaryHref="/resources/upload"
          primaryLabel="Upload resource"
          primaryShortLabel="Upload"
          primaryIcon="plus"
        />

        <main className="mx-auto max-w-[min(1720px,100vw)] px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-6 overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(12,18,27,0.94),rgba(8,10,16,0.98))] p-6 shadow-[0_28px_72px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8de2ff]">
                  Community shared assets
                </p>
                <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.3rem,5.2vw,4.7rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-white">
                  Reusable packs, prompts, presets, and workflows for AI filmmakers.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
                  Build faster by starting from community-made character packs, prompt systems,
                  style presets, sound kits, and production guides that already work.
                </p>
              </div>

              <div className="w-full max-w-xl">
                <div className="rounded-[1.5rem] border border-[rgba(78,213,255,0.18)] bg-[rgba(9,14,22,0.88)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search resources, tags, creators..."
                      className="h-12 rounded-[1rem] border-[rgba(78,213,255,0.16)] bg-[rgba(255,255,255,0.03)]"
                    />
                    <Button
                      type="button"
                      className="h-12 rounded-[1rem] bg-[#00e87b] px-5 text-[#04150d] hover:bg-[#23f495]"
                      leftIcon={<Search size={16} />}
                    >
                      Search
                    </Button>
                    <Button
                      type="button"
                      className="h-12 rounded-[1rem] border-[rgba(255,255,255,0.1)] bg-[rgba(127,119,221,0.18)] px-5 text-white hover:bg-[rgba(127,119,221,0.28)]"
                      leftIcon={<Upload size={16} />}
                      onClick={() => router.push("/resources/upload")}
                    >
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="hidden xl:block">
              <ResourceSidebar
                counts={counts}
                category={category}
                onCategoryChange={setCategory}
                activeTag={tag}
                tags={tags}
                onTagChange={setTag}
                quickFilter={quickFilter}
                onQuickFilterChange={setQuickFilter}
                sort={sort}
                onSortChange={setSort}
              />
            </div>

            <div className="space-y-5">
              <div className="xl:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCategory("all")}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
                      category === "all"
                        ? "bg-[rgba(0,232,123,0.16)] text-white"
                        : "border border-white/8 bg-[rgba(15,16,24,0.9)] text-text-secondary"
                    )}
                  >
                    All
                  </button>
                  {Object.entries(counts).map(([key, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key as ResourceCategory)}
                      className={cn(
                        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
                        category === key
                          ? "bg-[rgba(127,119,221,0.18)] text-white"
                          : "border border-white/8 bg-[rgba(15,16,24,0.9)] text-text-secondary"
                      )}
                    >
                      {key.replace("_", " ")} <span className="text-text-tertiary">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    {RESOURCE_SORT_LABELS[sort]}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {filteredResources.length} resources ready to reuse.
                  </p>
                </div>
                <Link
                  href="/resources/upload"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-[rgba(255,255,255,0.08)] xl:hidden"
                >
                  <Upload size={15} />
                  Upload resource
                </Link>
              </div>

              {filteredResources.length ? (
                <div className="stagger-up grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.7rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,12,17,0.9)] px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-text-primary">No resources match that search.</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Clear the filters or upload the first pack in this lane.
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
