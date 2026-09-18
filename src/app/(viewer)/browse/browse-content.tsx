"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/projects/project-card";
import { HoverPreviewOverlay } from "@/components/projects/hover-preview-overlay";
import { PreorderBottomSheet } from "@/components/projects/preorder-bottom-sheet";
import type { ProjectFeedItem } from "@/components/projects/types";
import {
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMATS,
  PROJECT_GENRE_LABELS,
  PROJECT_GENRES,
  type ProjectLifecycleStatus,
} from "@/types/project";

type ProjectSort = "trending" | "new" | "almost_unlocked" | "recent_activity" | "momentum";
type BrowseStatus = ProjectLifecycleStatus | "watchable" | "back_early" | "all";

interface BrowseContentProps {
  initialQuery: string;
  initialGenre: string;
  initialFormat: string;
  initialStatus: string;
  initialSort: ProjectSort;
}

interface ProjectBrowseResponse {
  projects: ProjectFeedItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

const STATUS_OPTIONS: Array<{ value: BrowseStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "watchable", label: "Watch Now" },
  { value: "premiering", label: "Premiering" },
  { value: "released", label: "Released" },
  { value: "back_early", label: "Seed" },
  { value: "teaser", label: "Teasers" },
  { value: "in_production", label: "In Production" },
];

const STATUS_VALUES = new Set<BrowseStatus>(STATUS_OPTIONS.map((option) => option.value));

function parseBrowseStatus(value: string): BrowseStatus {
  return STATUS_VALUES.has(value as BrowseStatus) ? (value as BrowseStatus) : "all";
}

export function BrowseContent({
  initialQuery,
  initialGenre,
  initialFormat,
  initialStatus,
  initialSort,
}: BrowseContentProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [genre, setGenre] = useState(initialGenre);
  const [format, setFormat] = useState(initialFormat);
  const [status, setStatus] = useState<BrowseStatus>(parseBrowseStatus(initialStatus));
  const [sort, setSort] = useState<ProjectSort>(initialSort);
  const [contentRating, setContentRating] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const [projects, setProjects] = useState<ProjectFeedItem[]>([]);
  const [previewProject, setPreviewProject] = useState<ProjectFeedItem | null>(null);
  const [preorderProject, setPreorderProject] = useState<ProjectFeedItem | null>(null);

  const [projectCursor, setProjectCursor] = useState<number>(0);
  const [projectHasMore, setProjectHasMore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (genre) params.set("genre", genre);
    if (format) params.set("format", format);
    if (status !== "all") params.set("status", status);
    if (sort !== "recent_activity") params.set("sort", sort);
    if (contentRating) params.set("content_rating", contentRating);

    router.replace(params.toString() ? `/browse?${params.toString()}` : "/browse", {
      scroll: false,
    });
  }, [contentRating, format, genre, query, router, sort, status]);

  const fetchBrowseData = useCallback(async () => {
    setTransitioning(true);
    setLoading(true);
    setError(null);

    try {
      const projectParams = new URLSearchParams();
      projectParams.set("limit", "24");
      projectParams.set("cursor", "0");
      projectParams.set("sort", sort);
      if (query.trim()) projectParams.set("search", query.trim());
      if (genre) projectParams.set("genre", genre);
      if (format) projectParams.set("format", format);
      if (status) projectParams.set("status", status);
      if (contentRating) projectParams.set("content_rating", contentRating);

      const projectsRes = await fetch(`/api/projects/browse?${projectParams.toString()}`);
      const projectPayload = (await projectsRes.json()) as ProjectBrowseResponse;

      if (!projectsRes.ok) {
        throw new Error("Failed to load projects");
      }

      setProjects(projectPayload.projects ?? []);
      setProjectHasMore(Boolean(projectPayload.hasMore));
      setProjectCursor(projectPayload.nextCursor ?? 0);
      setFilterKey((k) => k + 1);
      // Brief delay to let DOM update before fade-in
      requestAnimationFrame(() => setTransitioning(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load browse results");
      setProjects([]);
      setTransitioning(false);
    } finally {
      setLoading(false);
    }
  }, [contentRating, format, genre, query, sort, status]);

  useEffect(() => {
    syncUrl();
    fetchBrowseData();
  }, [syncUrl, fetchBrowseData]);

  const loadMoreProjects = useCallback(async () => {
    if (!projectHasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "24");
      params.set("cursor", String(projectCursor));
      params.set("sort", sort);
      if (query.trim()) params.set("search", query.trim());
      if (genre) params.set("genre", genre);
      if (format) params.set("format", format);
      if (status) params.set("status", status);
      if (contentRating) params.set("content_rating", contentRating);

      const response = await fetch(`/api/projects/browse?${params.toString()}`);
      const payload = (await response.json()) as ProjectBrowseResponse;

      if (!response.ok) throw new Error("Could not load more projects");

      setProjects((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        (payload.projects ?? []).forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      });
      setProjectHasMore(Boolean(payload.hasMore));
      setProjectCursor(payload.nextCursor ?? projectCursor);
    } catch {
      setProjectHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [contentRating, format, genre, loadingMore, projectCursor, projectHasMore, query, sort, status]);

  const genreOptions = useMemo(
    () => [
      { value: "", label: "All genres" },
      ...PROJECT_GENRES.map((value) => ({
        value,
        label: PROJECT_GENRE_LABELS[value],
      })),
    ],
    []
  );

  const formatOptions = useMemo(
    () => [
      { value: "", label: "All formats" },
      ...PROJECT_FORMATS.map((value) => ({
        value,
        label: PROJECT_FORMAT_LABELS[value],
      })),
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: "recent_activity", label: "Recent Activity" },
      { value: "momentum", label: "Momentum" },
      { value: "almost_unlocked", label: "Almost Unlocked" },
      { value: "trending", label: "Trending" },
      { value: "new", label: "Newest" },
    ],
    []
  );

  const contentRatingOptions = useMemo(
    () => [
      { value: "", label: "All ratings" },
      { value: "general", label: "G" },
      { value: "teen", label: "PG-13" },
      { value: "mature", label: "R" },
    ],
    []
  );

  const currentLens = useMemo(() => {
    switch (status) {
      case "watchable":
        return {
          eyebrow: "Watch Now",
          title: "Films you can jump into right now.",
          description: "Released films and active premieres come first so Browse feels alive the moment you land here.",
        };
      case "premiering":
        return {
          eyebrow: "Premiering",
          title: "Upcoming debuts and live events.",
          description: "Track the next films about to go live, then jump into the project page before the room opens.",
        };
      case "released":
        return {
          eyebrow: "Released",
          title: "Finished films ready to watch.",
          description: "Browse the catalog of AI films already released on Myriad.",
        };
      case "back_early":
        return {
          eyebrow: "Seed",
          title: "Live projects still building momentum.",
          description: "These are the concepts you can still seed before production, premiere, and release.",
        };
      case "teaser":
        return {
          eyebrow: "Teasers",
          title: "Concept pages with no commerce attached yet.",
          description: "Browse early teaser projects that live on the normal project page but have not entered preorder or production yet.",
        };
      case "in_production":
        return {
          eyebrow: "In Production",
          title: "Films already being made.",
          description: "Preorders are still open while creators finish production and build toward premiere.",
        };
      default:
        return {
          eyebrow: "All Live Projects",
          title: "Teasers, launches, and watch-now films in one grid.",
          description: "Use Browse when you want the full live mix: teaser projects, seed campaigns, films in production, premieres, and finished releases.",
        };
    }
  }, [status]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setGenre("");
    setFormat("");
    setStatus("all");
    setSort("recent_activity");
    setContentRating("");
    setMoreFiltersOpen(false);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
      <h1 className="sr-only">Browse Projects</h1>
      <div className="rounded-2xl border border-border bg-page/95 p-4 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">
              {currentLens.eyebrow}
            </p>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-display text-2xl font-semibold text-text-primary sm:text-3xl">
                  {currentLens.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-text-secondary sm:text-base">
                  {currentLens.description}
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">
                Search when you know what you want. Use quick filters when you don&apos;t.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects or creators"
                className="pl-9"
                aria-label="Search projects or creators"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="sm:hidden shrink-0"
              aria-label="Toggle filters"
            >
              <Filter size={14} />
              {(genre || format || contentRating || status !== "all" || sort !== "recent_activity") && (
                <span className="ml-1 h-2 w-2 rounded-full bg-brand-500" />
              )}
            </Button>
          </div>

          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2">
              {STATUS_OPTIONS.map((option) => {
                const isActive = status === option.value;
                const activeClassName =
                  option.value === "watchable"
                    ? "border-green-500/40 bg-green-500/14 text-green-400"
                    : option.value === "teaser"
                      ? "border-white/25 bg-white/8 text-white/90"
                      : option.value === "all"
                      ? "border-white/20 bg-white/8 text-white/85"
                      : option.value === "premiering"
                        ? "border-amber-500/40 bg-amber-500/14 text-amber-400"
                        : option.value === "released"
                          ? "border-green-500/40 bg-green-500/14 text-green-400"
                          : option.value === "back_early"
                            ? "border-teal-400/40 bg-teal-500/12 text-teal-300"
                            : option.value === "in_production"
                              ? "border-purple-500/40 bg-purple-500/14 text-purple-400"
                              : "border-white/20 bg-white/8 text-white/85";

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatus(option.value);
                      setSort(
                        option.value === "watchable" || option.value === "premiering" || option.value === "released" || option.value === "all" || option.value === "teaser"
                          ? "recent_activity"
                          : option.value === "back_early" || option.value === "in_production"
                            ? "momentum"
                            : sort
                      );
                    }}
                    className={`press-effect shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? activeClassName
                        : "border-transparent bg-surface text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters — always visible on desktop, collapsible on mobile */}
          <div className={`${filtersOpen ? "flex" : "hidden"} sm:flex flex-col gap-3`}>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <Select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                options={genreOptions}
                aria-label="Filter by genre"
              />
              <Select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                options={formatOptions}
                aria-label="Filter by format"
              />
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value as ProjectSort)}
                options={sortOptions}
                aria-label="Sort projects"
              />
              <Button
                variant="secondary"
                onClick={() => setMoreFiltersOpen((prev) => !prev)}
                className="w-full"
              >
                <Filter size={14} />
                {moreFiltersOpen ? "Less Filters" : "More Filters"}
              </Button>
              <Button
                variant="secondary"
                onClick={resetFilters}
                className="col-span-2 lg:col-span-1 w-full"
              >
                <Filter size={14} /> Reset
              </Button>
            </div>

            {moreFiltersOpen ? (
              <div className="rounded-xl border border-border bg-page-secondary p-3">
                <div className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-start">
                  <Select
                    value={contentRating}
                    onChange={(event) => setContentRating(event.target.value)}
                    options={contentRatingOptions}
                    aria-label="Filter by content rating"
                  />
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
                      Viewer Shortcuts
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSort("almost_unlocked");
                          setStatus("back_early");
                          setGenre("");
                          setFormat("");
                        }}
                        className="press-effect rounded-full border border-teal-400/30 bg-teal-500/10 px-3.5 py-1.5 text-xs font-semibold text-teal-300 transition-all hover:bg-teal-500/20"
                      >
                        Almost Unlocked
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSort("trending");
                          setStatus("all");
                        }}
                        className="press-effect rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-xs font-semibold text-orange-400 transition-all hover:bg-orange-500/20"
                      >
                        Trending
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenre("sci_fi")}
                        className="press-effect rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-semibold text-purple-400 transition-all hover:bg-purple-500/20"
                      >
                        Sci-Fi
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenre("action")}
                        className="press-effect rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-400 transition-all hover:bg-blue-500/20"
                      >
                        Action
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenre("fantasy")}
                        className="press-effect rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/20"
                      >
                        Fantasy
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormat("animated")}
                        className="press-effect rounded-full border border-pink-500/30 bg-pink-500/10 px-3.5 py-1.5 text-xs font-semibold text-pink-400 transition-all hover:bg-pink-500/20"
                      >
                        Animated
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-role-danger-border bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">{error}</div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">Projects</h2>
          <span className="text-sm text-text-tertiary">{projects.length} shown</span>
        </div>

        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`project-skeleton-${idx}`} className="skeleton-shimmer aspect-video rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon="🎬"
            title="No projects found"
            description="Try a different filter set or reset your search."
          />
        ) : (
          <>
            <div
              key={filterKey}
              ref={gridRef}
              className={`stagger-up grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}
            >
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onHoverPreview={setPreviewProject}
                  onPreorder={setPreorderProject}
                />
              ))}
            </div>
            {projectHasMore ? (
              <div className="flex flex-col items-center gap-3 pt-4">
                <Button variant="secondary" onClick={() => void loadMoreProjects()} disabled={loadingMore} className="press-effect">
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                      </span>
                      Loading
                    </span>
                  ) : "Load More Projects"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <HoverPreviewOverlay
        project={previewProject}
        onClose={() => setPreviewProject(null)}
        onPreorder={(p) => {
          setPreviewProject(null);
          setPreorderProject(p);
        }}
      />

      {preorderProject && preorderProject.lifecycle_status !== "teaser" && (
        <PreorderBottomSheet
          open
          onClose={() => setPreorderProject(null)}
          projectId={preorderProject.id}
          title={preorderProject.title}
          amountCents={
            preorderProject.lifecycle_status === "premiering" || preorderProject.lifecycle_status === "released"
              ? preorderProject.release_price_cents
              : preorderProject.preorder_price_cents
          }
          mode={
            preorderProject.lifecycle_status === "premiering" || preorderProject.lifecycle_status === "released"
              ? "purchase"
              : "preorder"
          }
          lifecycleStatus={preorderProject.lifecycle_status}
        />
      )}
    </div>
  );
}
