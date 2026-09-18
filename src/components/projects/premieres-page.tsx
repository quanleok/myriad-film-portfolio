"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { PreorderBottomSheet } from "@/components/projects/preorder-bottom-sheet";
import type { ProjectFeedItem } from "@/components/projects/types";
import { isFreeWatchProject } from "@/components/projects/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 24;

const TABS = [
  { key: "premiering", label: "Premiering" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "released", label: "Released" },
  { key: "all", label: "All" },
] as const;

type PremieresTab = (typeof TABS)[number]["key"];

interface PremieresResponse {
  projects?: ProjectFeedItem[];
  page?: number;
  hasMore?: boolean;
  error?: string;
}

function isPremieresTab(value: string | null): value is PremieresTab {
  return TABS.some((tab) => tab.key === value);
}

function PremiereGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={`premieres-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-role-border-subtle bg-page-secondary"
        >
          <div className="skeleton-shimmer aspect-video" />
          <div className="space-y-3 p-4">
            <div className="skeleton-shimmer h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-5 w-5/6 rounded" />
            <div className="skeleton-shimmer h-4 w-2/3 rounded" />
            <div className="skeleton-shimmer h-10 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroSpotlight({ projects, onPreorder }: { projects: ProjectFeedItem[]; onPreorder: (p: ProjectFeedItem) => void }) {
  if (projects.length === 0) return null;

  const [featured, ...rest] = projects;
  const featuredHref = featured.slug ? `/project/${featured.slug}` : `/project/${featured.id}`;
  const featuredIsFreeWatch = isFreeWatchProject(featured.lifecycle_status, featured.release_price_cents);

  return (
    <section className="mt-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
        <h2 className="text-lg font-semibold text-text-primary">Spotlight</h2>
        <span className="text-xs text-text-tertiary">Most anticipated premieres</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Featured large card */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#F59E0B]/30 bg-gradient-to-b from-[#F59E0B]/8 to-transparent shadow-[0_8px_32px_-12px_rgba(245,158,11,0.4)] transition-all hover:border-[#F59E0B]/50 hover:shadow-[0_12px_48px_-12px_rgba(245,158,11,0.5)]">
          <a href={featuredHref} className="block">
            <div className="relative aspect-video overflow-hidden">
              <img
                src={featured.teaser_thumbnail_url || (featured.teaser_asset_id ? `/api/teaser-thumbnail/${featured.teaser_asset_id}` : undefined)}
                alt={featured.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/40 px-2.5 py-0.5 text-xs font-semibold text-[#F59E0B]">
                    {featured.premiere_date ? `Premieres ${new Date(featured.premiere_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Premiering Soon"}
                  </span>
                  {featured.genre && (
                    <span className="text-xs text-white/60">{featured.genre}</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">{featured.title}</h3>
                {featured.hook && (
                  <p className="mt-1 text-sm text-white/70 line-clamp-2">{featured.hook}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-white/50">
                  {featured.profiles && (
                    <span>by {featured.profiles.display_name || featured.profiles.username}</span>
                  )}
                  {featured.like_count_cache > 0 && (
                    <span>♥ {featured.like_count_cache}</span>
                  )}
                  {featured.preorder_count_cache > 0 && (
                    <span>{featured.preorder_count_cache} preorders</span>
                  )}
                </div>
              </div>
            </div>
          </a>
          <div className="p-4">
            <button
              onClick={() => {
                if (featuredIsFreeWatch) {
                  window.location.href = featuredHref;
                  return;
                }
                onPreorder(featured);
              }}
              className="w-full rounded-xl bg-[#F59E0B] px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#D97706] active:scale-[0.98]"
            >
              {featuredIsFreeWatch
                ? featured.lifecycle_status === "released"
                  ? "Watch Free"
                  : "Watch Premiere"
                : featured.lifecycle_status === "released"
                  ? `Watch — $${((featured.release_price_cents ?? 0) / 100).toFixed(0)}`
                  : `Buy Access — $${((featured.release_price_cents ?? featured.preorder_price_cents ?? 0) / 100).toFixed(0)}`}
            </button>
          </div>
        </div>

        {/* Side cards */}
        <div className="flex flex-col gap-4">
          {rest.map((project) => (
            <a
              key={project.id}
              href={`/project/${project.slug}`}
              className="group flex gap-4 overflow-hidden rounded-xl border border-[#F59E0B]/20 bg-page-secondary p-3 transition-all hover:border-[#F59E0B]/40 hover:shadow-[0_4px_20px_-8px_rgba(245,158,11,0.3)]"
            >
              <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={project.teaser_thumbnail_url || (project.teaser_asset_id ? `/api/teaser-thumbnail/${project.teaser_asset_id}` : undefined)}
                  alt={project.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                  {project.premiere_date ? new Date(project.premiere_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Coming Soon"}
                </span>
                <h3 className="mt-1 font-semibold text-text-primary line-clamp-1">{project.title}</h3>
                {project.hook && (
                  <p className="mt-0.5 text-xs text-text-secondary line-clamp-1">{project.hook}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-xs text-text-tertiary">
                  {project.profiles && (
                    <span>{project.profiles.display_name || project.profiles.username}</span>
                  )}
                  {project.like_count_cache > 0 && <span>♥ {project.like_count_cache}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PremieresPage() {
  const requestIdRef = useRef(0);
  const [activeTab, setActiveTab] = useState<PremieresTab>("premiering");
  const [projects, setProjects] = useState<ProjectFeedItem[]>([]);
  const [spotlightProjects, setSpotlightProjects] = useState<ProjectFeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutProject, setCheckoutProject] = useState<ProjectFeedItem | null>(null);
  const [hydratedTab, setHydratedTab] = useState(false);

  const syncTabToUrl = useCallback((tab: PremieresTab) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (tab === "premiering") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    const nextUrl = query ? `/premieres?${query}` : "/premieres";
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const fetchProjects = useCallback(async (pageNumber: number, replace: boolean) => {
    const requestId = ++requestIdRef.current;

    if (replace) {
      setInitialLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      params.set("page", String(pageNumber));
      params.set("limit", String(PAGE_SIZE));

      const response = await fetch(`/api/premieres?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as PremieresResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load premieres");
      }

      const nextProjects = Array.isArray(payload.projects) ? payload.projects : [];

      if (requestId !== requestIdRef.current) return;

      setProjects((previous) => {
        if (replace) return nextProjects;

        const merged = new Map(previous.map((project) => [project.id, project]));
        nextProjects.forEach((project) => merged.set(project.id, project));
        return Array.from(merged.values());
      });
      setPage(pageNumber);
      setHasMore(Boolean(payload.hasMore));
      setError(null);
    } catch (fetchError) {
      if (requestId !== requestIdRef.current) return;

      setHasMore(false);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load premieres");

      if (replace) {
        setProjects([]);
      }
    } finally {
      if (requestId !== requestIdRef.current) return;

      if (replace) {
        setInitialLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [activeTab]);

  // Fetch spotlight: top 3 premiering projects sorted by popularity
  useEffect(() => {
    async function fetchSpotlight() {
      try {
        const res = await fetch("/api/premieres?tab=premiering&limit=3&sort=popular", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.projects)) {
          setSpotlightProjects(data.projects);
        }
      } catch {
        // Spotlight is non-critical
      }
    }
    fetchSpotlight();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (isPremieresTab(tabParam)) {
      setActiveTab(tabParam);
    }
    setHydratedTab(true);
  }, []);

  useEffect(() => {
    if (!hydratedTab) return;

    syncTabToUrl(activeTab);
    void fetchProjects(1, true);
  }, [activeTab, fetchProjects, hydratedTab, syncTabToUrl]);

  const handleTabChange = (tab: PremieresTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
    setHasMore(false);
  };

  const handleLoadMore = () => {
    if (initialLoading || loadingMore || !hasMore) return;
    void fetchProjects(page + 1, false);
  };

  const handleRetry = () => {
    void fetchProjects(1, true);
  };

  const isPurchase =
    checkoutProject?.lifecycle_status === "premiering" ||
    checkoutProject?.lifecycle_status === "released";

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section className="rounded-3xl border border-[#F59E0B]/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-5 py-6 shadow-[0_18px_60px_-40px_rgba(245,158,11,0.5)] sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F59E0B]">
            Premieres
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold text-text-primary sm:text-4xl">
                Upcoming debuts and fresh releases
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary sm:text-base">
                Track scheduled premieres, catch recent drops, and jump straight into the films that are live now.
              </p>
            </div>
            <p className="text-sm font-medium text-[#FCD38D]">
              Amber cards mark the next films about to go live.
            </p>
          </div>
        </section>

        <HeroSpotlight projects={spotlightProjects} onPreorder={setCheckoutProject} />

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "border-[#F59E0B]/40 bg-[#F59E0B]/16 text-[#F59E0B] shadow-[0_0_0_1px_rgba(245,158,11,0.18),0_10px_30px_-20px_rgba(245,158,11,0.75)]"
                    : "border-role-border-subtle bg-page-secondary text-text-secondary hover:border-[#F59E0B]/25 hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && projects.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-role-danger-edge bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">
            Couldn&apos;t refresh premieres. Showing the latest loaded results.
          </div>
        ) : null}

        <div className="mt-6">
          {initialLoading ? (
            <PremiereGridSkeleton />
          ) : error && projects.length === 0 ? (
            <EmptyState
              icon="!?"
              title="Couldn&apos;t load premieres"
              description="The premieres feed is unavailable right now. Try again in a moment."
              actionLabel="Try Again"
              onAction={handleRetry}
            />
          ) : projects.length === 0 ? (
            <EmptyState
              icon="🎬"
              title={activeTab === "released" ? "No releases yet" : "No premieres scheduled"}
              description={
                activeTab === "released"
                  ? "Fresh releases will appear here as films move out of their premiere window."
                  : "Check back soon for upcoming AI film debuts and new release drops."
              }
              actionLabel={activeTab === "premiering" ? undefined : "View Premiering"}
              onAction={activeTab === "premiering" ? undefined : () => handleTabChange("premiering")}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    showStatus
                    onPreorder={setCheckoutProject}
                  />
                ))}
              </div>

              {hasMore ? (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleLoadMore}
                    loading={loadingMore}
                    className="border-[#F59E0B]/25 hover:border-[#F59E0B]/45"
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </Button>
                </div>
              ) : (
                <p className="mt-8 text-center text-sm text-text-tertiary">
                  You&apos;ve reached the end of the current premiere lineup.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {checkoutProject ? (
        <PreorderBottomSheet
          open
          onClose={() => setCheckoutProject(null)}
          projectId={checkoutProject.id}
          title={checkoutProject.title}
          amountCents={isPurchase ? checkoutProject.release_price_cents : checkoutProject.preorder_price_cents}
          mode={isPurchase ? "purchase" : "preorder"}
          lifecycleStatus={checkoutProject.lifecycle_status}
          onSuccess={() => setCheckoutProject(null)}
        />
      ) : null}
    </>
  );
}
