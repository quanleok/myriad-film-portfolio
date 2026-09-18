"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clapperboard } from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { ExploreHero } from "@/components/projects/explore-hero";
import { ExploreMarqueeRail } from "@/components/projects/explore-marquee-rail";
import { HoverPreviewOverlay } from "@/components/projects/hover-preview-overlay";
import { CinemaPanelOverlay } from "@/components/projects/cinema-panel-overlay";
import { PreorderBottomSheet } from "@/components/projects/preorder-bottom-sheet";
import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectFeedItem } from "@/components/projects/types";
import type { ProjectLifecycleStatus } from "@/types/project";

interface CuratedSection {
  key: string;
  title: string;
  status: string;
  sort: string;
  limit: number;
  lifecycleStatus: ProjectLifecycleStatus;
}

const CURATED_SECTIONS: CuratedSection[] = [
  {
    key: "premiering",
    title: "Premiering Soon",
    status: "premiering",
    sort: "recent_activity",
    limit: 8,
    lifecycleStatus: "premiering",
  },
  {
    key: "unlocking",
    title: "Seeding Now",
    status: "unlocking",
    sort: "momentum",
    limit: 8,
    lifecycleStatus: "unlocking",
  },
  {
    key: "in_production",
    title: "In Production",
    status: "in_production",
    sort: "recent_activity",
    limit: 8,
    lifecycleStatus: "in_production",
  },
  {
    key: "released",
    title: "Recently Released",
    status: "released",
    sort: "recent_activity",
    limit: 8,
    lifecycleStatus: "released",
  },
];

const HERO_ORDER = ["premiering", "unlocking", "in_production", "released"] as const;

function buildBrowseUrl({
  status,
  sort,
  limit,
}: {
  status?: string;
  sort: string;
  limit: number;
}) {
  const params = new URLSearchParams({ sort, limit: String(limit) });
  if (status) {
    params.set("status", status);
  }
  return `/api/projects/browse?${params.toString()}`;
}

function dedupeProjects(groups: ProjectFeedItem[][]) {
  const seen = new Set<string>();
  const projects: ProjectFeedItem[] = [];

  for (const group of groups) {
    for (const project of group) {
      if (seen.has(project.id)) continue;
      seen.add(project.id);
      projects.push(project);
    }
  }

  return projects;
}

function getTransactionConfig(project: ProjectFeedItem) {
  const isPurchase = project.lifecycle_status === "premiering" || project.lifecycle_status === "released";

  return {
    amountCents: isPurchase ? project.release_price_cents : project.preorder_price_cents,
    mode: isPurchase ? ("purchase" as const) : ("preorder" as const),
  };
}

function SurfaceSectionHeading({
  eyebrow,
  title,
  href,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-text-tertiary">
          {eyebrow}
        </p>
        <h2 className="font-display text-[1.9rem] font-semibold tracking-[-0.06em] text-text-primary">
          {title}
        </h2>
      </div>
      {href && actionLabel ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#e7bf6a]"
        >
          {actionLabel}
          <ArrowRight size={14} />
        </Link>
      ) : null}
    </div>
  );
}

function ProjectsSurfaceSkeleton() {
  return (
    <main className="space-y-10 pb-16 pt-8">
      <section className="grid gap-6 rounded-[2rem] border border-border bg-page/95 p-5 shadow-sm backdrop-blur-xl lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:p-7">
        <div className="space-y-4">
          <div className="skeleton-shimmer h-3 w-28 rounded-full" />
          <div className="skeleton-shimmer h-14 max-w-xl rounded-3xl" />
          <div className="skeleton-shimmer h-6 max-w-lg rounded-2xl" />
          <div className="flex gap-3 pt-2">
            <div className="skeleton-shimmer h-11 w-40 rounded-full" />
            <div className="skeleton-shimmer h-11 w-36 rounded-full" />
          </div>
        </div>
        <div className="skeleton-shimmer min-h-[320px] rounded-[1.7rem]" />
      </section>

      <section className="space-y-5">
        <div className="skeleton-shimmer h-7 w-52 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton-shimmer aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="skeleton-shimmer h-6 w-44 rounded-2xl" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <div key={cardIndex} className="skeleton-shimmer h-[280px] w-[320px] shrink-0 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

interface ProjectsSurfacePageProps {
  initialSections?: Record<string, ProjectFeedItem[]>;
  initialEditorial?: ProjectFeedItem[];
}

export function ProjectsSurfacePage({
  initialSections,
  initialEditorial,
}: ProjectsSurfacePageProps = {}) {
  const hasInitialData = !!(initialSections && initialEditorial);
  const [sectionData, setSectionData] = useState<Record<string, ProjectFeedItem[]>>(initialSections ?? {});
  const [editorialProjects, setEditorialProjects] = useState<ProjectFeedItem[]>(initialEditorial ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadFailed, setLoadFailed] = useState(false);
  const [preorderProject, setPreorderProject] = useState<ProjectFeedItem | null>(null);
  const [previewProject, setPreviewProject] = useState<ProjectFeedItem | null>(null);
  const [overlayState, setOverlayState] = useState<{ startIndex: number } | null>(null);

  useEffect(() => {
    if (hasInitialData) return;
    const controller = new AbortController();

    async function fetchProjects() {
      try {
        const sectionResponses = await Promise.all(
          CURATED_SECTIONS.map(async (section) => {
            const response = await fetch(
              buildBrowseUrl({
                status: section.status,
                sort: section.sort,
                limit: section.limit,
              }),
              { signal: controller.signal }
            );

            if (!response.ok) {
              return { key: section.key, projects: [] as ProjectFeedItem[] };
            }

            const payload = (await response.json()) as { projects?: ProjectFeedItem[] };
            return {
              key: section.key,
              projects: payload.projects ?? [],
            };
          })
        );

        const editorialResponse = await fetch(
          buildBrowseUrl({ sort: "recent_activity", limit: 9 }),
          { signal: controller.signal }
        );

        const nextSections: Record<string, ProjectFeedItem[]> = {};
        for (const section of sectionResponses) {
          nextSections[section.key] = section.projects;
        }

        const editorialPayload = editorialResponse.ok
          ? ((await editorialResponse.json()) as { projects?: ProjectFeedItem[] })
          : { projects: [] as ProjectFeedItem[] };

        setSectionData(nextSections);
        setEditorialProjects(editorialPayload.projects ?? []);
        setLoadFailed(false);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLoadFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchProjects();

    return () => controller.abort();
  }, []);

  const heroProjects = useMemo(() => {
    const orderedGroups = HERO_ORDER.map((key) => sectionData[key] ?? []);
    return dedupeProjects(orderedGroups).slice(0, 2);
  }, [sectionData]);

  const heroIds = useMemo(() => new Set(heroProjects.map((project) => project.id)), [heroProjects]);

  const curatedProjects = useMemo(() => {
    const combined = dedupeProjects([
      editorialProjects,
      ...CURATED_SECTIONS.map((section) => sectionData[section.key] ?? []),
    ]);

    return combined.filter((project) => !heroIds.has(project.id)).slice(0, 6);
  }, [editorialProjects, heroIds, sectionData]);

  const allProjects = useMemo(
    () =>
      dedupeProjects([
        heroProjects,
        curatedProjects,
        ...CURATED_SECTIONS.map((section) => sectionData[section.key] ?? []),
      ]),
    [curatedProjects, heroProjects, sectionData]
  );

  const visibleSections = useMemo(
    () => CURATED_SECTIONS.filter((section) => (sectionData[section.key] ?? []).length >= 2),
    [sectionData]
  );

  const hasContent = heroProjects.length > 0 || curatedProjects.length > 0 || visibleSections.length > 0;

  function handleCardClick(project: ProjectFeedItem) {
    const startIndex = allProjects.findIndex((candidate) => candidate.id === project.id);
    setOverlayState({ startIndex: startIndex >= 0 ? startIndex : 0 });
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="brand-halo-bg mx-auto max-w-7xl px-4 py-8">
        <VideoHubHeader
          activeTab="projects"
          primaryHref="/projects/new"
          primaryLabel="Start a project"
          primaryShortLabel="Start"
          primaryIcon="plus"
        />

        {loading ? (
          <ProjectsSurfaceSkeleton />
        ) : (
          <main className="space-y-10 pb-16 pt-8">
            <section className="grid gap-6 rounded-[2rem] border border-[rgba(245,158,11,0.18)] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),rgba(16,14,8,0.92)_45%,rgba(7,17,12,0.96)_100%)] p-5 shadow-[0_18px_48px_rgba(94,58,0,0.14)] backdrop-blur-xl lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:p-7">
              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#e7bf6a]">
                    Curated project discovery
                  </p>
                  <div className="space-y-3">
                    <h1 className="max-w-xl font-display text-[clamp(2.4rem,4.3vw,4.6rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-text-primary">
                      Find the film campaigns with real momentum.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-text-secondary">
                      `/projects` is the editorial front door for serious AI film releases: the launches closing in,
                      the productions moving, and the finished work worth opening next.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/explore"
                      className="press-effect inline-flex items-center gap-2 rounded-full bg-[#dca24a] px-5 py-3 text-sm font-semibold text-[#140d02] hover:bg-[#e9b45a]"
                    >
                      Open full explorer
                      <ArrowRight size={15} />
                    </Link>
                    <Link
                      href="/projects/new"
                      className="press-effect inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium text-text-primary hover:bg-surface-hover"
                    >
                      Start a project
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-border pt-4 text-sm text-text-secondary sm:grid-cols-3">
                  <div>
                    <p className="font-medium text-text-primary">Hero spotlight</p>
                    <p className="mt-1">A tighter editorial read than the full Explore feed.</p>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Live lifecycle rails</p>
                    <p className="mt-1">Premiering, seeding, production, and released are separated on purpose.</p>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Real project actions</p>
                    <p className="mt-1">Cards open cinema mode and preorder flows from the surface.</p>
                  </div>
                </div>
              </div>

              <div className="min-h-[320px]">
                <ExploreHero projects={heroProjects} onPreorder={setPreorderProject} />
              </div>
            </section>

            {hasContent ? (
              <>
                {curatedProjects.length > 0 ? (
                  <section className="space-y-5">
                    <SurfaceSectionHeading
                      eyebrow="Editorial picks"
                      title="The strongest project stories right now"
                      href="/explore"
                      actionLabel="See the full feed"
                    />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {curatedProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onPreorder={setPreorderProject}
                          onCardClick={handleCardClick}
                          onHoverPreview={setPreviewProject}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {visibleSections.length > 0 ? (
                  <section className="space-y-10 border-t border-border pt-10">
                    {visibleSections.map((section) => (
                      <ExploreMarqueeRail
                        key={section.key}
                        title={section.title}
                        projects={sectionData[section.key] ?? []}
                        lifecycleStatus={section.lifecycleStatus}
                        onPreorder={setPreorderProject}
                        onCardClick={handleCardClick}
                        onHoverPreview={setPreviewProject}
                      />
                    ))}
                  </section>
                ) : null}

                <section className="rounded-[2rem] border border-border bg-surface/80 p-6 shadow-sm sm:p-7">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-text-tertiary">
                        Full browse workspace
                      </p>
                      <h2 className="font-display text-[2rem] font-semibold tracking-[-0.07em] text-text-primary">
                        Want the complete project map instead of the curated front page?
                      </h2>
                      <p className="text-sm leading-7 text-text-secondary">
                        Use Explore when you want the full lifecycle feed, more density, and the broader browse system.
                        Stay here when you want the sharper editorial read.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/explore"
                        className="press-effect inline-flex items-center gap-2 rounded-full bg-[#dca24a] px-5 py-3 text-sm font-semibold text-[#140d02] hover:bg-[#e9b45a]"
                      >
                        Open full explorer
                        <ArrowRight size={15} />
                      </Link>
                      <Link
                        href="/premieres"
                        className="press-effect inline-flex items-center gap-2 rounded-full border border-border bg-page px-5 py-3 text-sm font-medium text-text-primary hover:bg-surface-hover"
                      >
                        View premieres
                      </Link>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-[2rem] border border-border bg-surface p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-page text-text-secondary">
                  <Clapperboard size={24} />
                </div>
                <h2 className="mt-5 font-display text-[2rem] font-semibold tracking-[-0.06em] text-text-primary">
                  No public film projects yet.
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
                  {loadFailed
                    ? "The curated feed could not be loaded just now. You can still jump into the full explorer or start the next project."
                    : "This surface is ready for the next serious launch. Start a project or jump into Explore once new campaigns are live."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/explore"
                    className="press-effect inline-flex items-center gap-2 rounded-full bg-[#dca24a] px-5 py-3 text-sm font-semibold text-[#140d02] hover:bg-[#e9b45a]"
                  >
                    Open full explorer
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/projects/new"
                    className="press-effect inline-flex items-center gap-2 rounded-full border border-border bg-page px-5 py-3 text-sm font-medium text-text-primary hover:bg-surface-hover"
                  >
                    Start a project
                  </Link>
                </div>
              </section>
            )}
          </main>
        )}
      </div>

      <HoverPreviewOverlay
        project={previewProject}
        onClose={() => setPreviewProject(null)}
        onPreorder={(project) => {
          setPreviewProject(null);
          setPreorderProject(project);
        }}
      />

      {preorderProject ? (
        <PreorderBottomSheet
          open
          onClose={() => setPreorderProject(null)}
          projectId={preorderProject.id}
          title={preorderProject.title}
          amountCents={getTransactionConfig(preorderProject).amountCents}
          mode={getTransactionConfig(preorderProject).mode}
          onSuccess={() => setPreorderProject(null)}
        />
      ) : null}

      {overlayState && allProjects.length > 0 ? (
        <CinemaPanelOverlay
          projects={allProjects}
          startIndex={overlayState.startIndex}
          status="curated"
          onClose={() => setOverlayState(null)}
        />
      ) : null}
    </div>
  );
}
