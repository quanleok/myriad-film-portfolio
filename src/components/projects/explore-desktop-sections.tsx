"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";
import { PreorderBottomSheet } from "@/components/projects/preorder-bottom-sheet";
import { HoverPreviewOverlay } from "@/components/projects/hover-preview-overlay";
import { CinemaPanelOverlay } from "@/components/projects/cinema-panel-overlay";
import { ExploreHero } from "@/components/projects/explore-hero";
import { ExploreMarqueeRail } from "@/components/projects/explore-marquee-rail";
import type { ProjectFeedItem } from "@/components/projects/types";
import type { ProjectLifecycleStatus } from "@/types/project";

/* ── Section definitions ── */

interface SectionDef {
  key: string;
  title: string;
  status?: string;
  genre?: string;
  lifecycleColor: ProjectLifecycleStatus | null;
  sort: string;
}

const SECTIONS: SectionDef[] = [
  // Lifecycle sections first — always visible with 1+ project
  { key: "premiering", title: "Premiering Soon", status: "premiering", lifecycleColor: "premiering", sort: "trending" },
  { key: "unlocking", title: "Seed Now", status: "unlocking", lifecycleColor: "unlocking", sort: "momentum" },
  { key: "in_production", title: "In Production", status: "in_production", lifecycleColor: "in_production", sort: "new" },
  { key: "released", title: "Recently Released", status: "released", lifecycleColor: "released", sort: "recent_activity" },
  // Genre sections — need 2+ projects to show
  { key: "animation", title: "Animation", genre: "animation", lifecycleColor: null, sort: "trending" },
  { key: "sci_fi", title: "Sci-Fi", genre: "sci_fi", lifecycleColor: null, sort: "trending" },
  { key: "anime", title: "Anime", genre: "anime", lifecycleColor: null, sort: "trending" },
  { key: "parody", title: "Parody", genre: "parody", lifecycleColor: null, sort: "trending" },
];

function buildFetchUrl(section: SectionDef, limit: number): string {
  const params = new URLSearchParams();
  if (section.status) params.set("status", section.status);
  if (section.genre) params.set("genre", section.genre);
  params.set("sort", section.sort);
  params.set("limit", String(limit));
  return `/api/projects/browse?${params.toString()}`;
}

/* ── Main component ── */

export function ExploreDesktopSections() {
  const [sectionData, setSectionData] = useState<Record<string, ProjectFeedItem[]>>({});
  const [heroProjects, setHeroProjects] = useState<ProjectFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preorderProject, setPreorderProject] = useState<ProjectFeedItem | null>(null);
  const [previewProject, setPreviewProject] = useState<ProjectFeedItem | null>(null);
  const [overlayState, setOverlayState] = useState<{ startIndex: number } | null>(null);

  // Infinite scroll state
  const [moreCursor, setMoreCursor] = useState<number | null>(null);
  const [moreProjects, setMoreProjects] = useState<ProjectFeedItem[]>([]);
  const [moreHasMore, setMoreHasMore] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Deduplicated project list for cinema overlay
  const allProjects = useMemo(() => {
    const seen = new Set<string>();
    const combined: ProjectFeedItem[] = [];
    const addUnique = (projects: ProjectFeedItem[]) => {
      for (const p of projects) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          combined.push(p);
        }
      }
    };
    addUnique(heroProjects);
    for (const section of SECTIONS) {
      addUnique(sectionData[section.key] ?? []);
    }
    addUnique(moreProjects);
    return combined;
  }, [heroProjects, sectionData, moreProjects]);

  function handleCardClick(project: ProjectFeedItem) {
    const index = allProjects.findIndex((p) => p.id === project.id);
    setOverlayState({ startIndex: index >= 0 ? index : 0 });
  }

  // ── Load sections + hero ──
  useEffect(() => {
    async function fetchAll() {
      try {
        const results = await Promise.all(
          SECTIONS.map(async (section) => {
            const res = await fetch(buildFetchUrl(section, 12));
            if (!res.ok) return { key: section.key, projects: [] as ProjectFeedItem[] };
            const data = await res.json();
            return { key: section.key, projects: (data.projects ?? []) as ProjectFeedItem[] };
          })
        );

        const map: Record<string, ProjectFeedItem[]> = {};
        for (const r of results) {
          map[r.key] = r.projects;
        }
        setSectionData(map);

        // Pick hero projects: top 2 from the first non-empty lifecycle section
        const heroPool: ProjectFeedItem[] = [];
        for (const key of ["premiering", "unlocking", "in_production", "released"]) {
          if (map[key]?.length) {
            heroPool.push(...map[key]);
            if (heroPool.length >= 2) break;
          }
        }
        setHeroProjects(heroPool.slice(0, 2));

        setMoreCursor(0);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    void fetchAll();
  }, []);

  // ── Infinite scroll: load more ──
  const loadMore = useCallback(async () => {
    if (moreLoading || !moreHasMore || moreCursor === null) return;
    setMoreLoading(true);
    try {
      const res = await fetch(
        `/api/projects/browse?sort=new&cursor=${moreCursor}&limit=12`
      );
      if (!res.ok) return;
      const data = await res.json();
      const newProjects: ProjectFeedItem[] = data.projects ?? [];

      const existingIds = new Set(moreProjects.map((p) => p.id));
      const unique = newProjects.filter((p) => !existingIds.has(p.id));

      setMoreProjects((prev) => [...prev, ...unique]);
      setMoreHasMore(Boolean(data.hasMore));
      setMoreCursor(data.nextCursor);
    } catch {
      setMoreHasMore(false);
    } finally {
      setMoreLoading(false);
    }
  }, [moreLoading, moreHasMore, moreCursor, moreProjects]);

  // ── Sentinel observer ──
  useEffect(() => {
    if (loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, loadMore]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="brand-halo-bg mx-auto max-w-7xl px-4 py-8">
        <div className="skeleton-shimmer mb-10 h-[340px] w-full rounded-2xl" />
        <div className="space-y-10">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="skeleton-shimmer mb-3 h-6 w-40 rounded" />
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="skeleton-shimmer h-[260px] w-[340px] shrink-0 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Lifecycle sections (status-based) show with 1+ project; genre sections only
  // appear once there is enough density that they feel intentional.
  const totalProjects = Object.values(sectionData).reduce((sum, arr) => sum + arr.length, 0);
  const nonEmptySections = SECTIONS.filter((s) => {
    const count = sectionData[s.key]?.length ?? 0;
    return s.status ? count >= 1 : (count >= 3 && totalProjects >= 10);
  });

  return (
    <>
      <div className="brand-halo-bg mx-auto max-w-7xl px-4 py-8">
        {/* Hero spotlight */}
        <ExploreHero
          projects={heroProjects}
          onPreorder={setPreorderProject}
        />

        {/* Section rails */}
        {nonEmptySections.length > 0 && (
          <div className="mt-12 space-y-12">
            {nonEmptySections.map((section) => (
              <ExploreMarqueeRail
                key={section.key}
                title={section.title}
                projects={sectionData[section.key] ?? []}
                lifecycleStatus={section.lifecycleColor}
                onPreorder={setPreorderProject}
                onCardClick={handleCardClick}
                onHoverPreview={setPreviewProject}
              />
            ))}
          </div>
        )}

        {/* More to Explore (infinite grid) */}
        {moreProjects.length > 0 && (
          <div className="mt-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-display text-lg font-semibold text-text-primary">
                More to Explore
              </h2>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-text-tertiary">
                {moreProjects.length}+
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {moreProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onPreorder={setPreorderProject}
                  onCardClick={handleCardClick}
                  onHoverPreview={setPreviewProject}
                />
              ))}
            </div>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {moreHasMore && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {moreLoading && (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            )}
          </div>
        )}

        {!moreHasMore && moreProjects.length > 0 && (
          <p className="py-8 text-center text-sm text-text-tertiary">
            You&apos;ve explored everything. Nice.
          </p>
        )}
      </div>

      <HoverPreviewOverlay
        project={previewProject}
        onClose={() => setPreviewProject(null)}
        onPreorder={(p) => {
          setPreviewProject(null);
          setPreorderProject(p);
        }}
      />

      {preorderProject ? (
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
          onSuccess={() => setPreorderProject(null)}
        />
      ) : null}

      {overlayState && allProjects.length > 0 && (
        <CinemaPanelOverlay
          projects={allProjects}
          startIndex={overlayState.startIndex}
          status="all"
          onClose={() => setOverlayState(null)}
        />
      )}
    </>
  );
}
