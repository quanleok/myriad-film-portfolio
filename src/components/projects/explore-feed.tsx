"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectFeedItem } from "@/components/projects/types";
import { PreorderBottomSheet } from "@/components/projects/preorder-bottom-sheet";
import { DiscussionBottomSheet } from "@/components/feed/discussion-bottom-sheet";
import { FeedCarousel } from "@/components/feed/feed-carousel";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 10;

interface FeedResponse {
  projects: ProjectFeedItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

export function ExploreFeed() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectFeedItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [preorderProject, setPreorderProject] = useState<ProjectFeedItem | null>(null);
  const [discussionProject, setDiscussionProject] = useState<ProjectFeedItem | null>(null);

  // Track when activeIndex changes to reset carousel to slide 0
  const [resetCounter, setResetCounter] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  // ── Data fetching ──

  const loadFeed = useCallback(
    async (nextCursor: number, append: boolean) => {
      if (loading) return;
      setLoading(true);

      try {
        const response = await fetch(
          `/api/projects/feed?cursor=${nextCursor}&limit=${PAGE_SIZE}`
        );
        const payload = (await response.json()) as FeedResponse;

        if (!response.ok) {
          throw new Error("Failed to fetch project feed");
        }

        const loadedProjects = payload.projects ?? [];
        setProjects((prev) => {
          if (!append) return loadedProjects;
          const byId = new Map(prev.map((p) => [p.id, p]));
          loadedProjects.forEach((p) => byId.set(p.id, p));
          return Array.from(byId.values());
        });
        setHasMore(Boolean(payload.hasMore));
        setCursor(payload.nextCursor);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // Initial load
  useEffect(() => {
    loadFeed(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Vertical scroll tracking via IntersectionObserver ──

  useEffect(() => {
    if (!containerRef.current || projects.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(
              (entry.target as HTMLElement).dataset.index ?? "0"
            );
            if (Number.isFinite(index)) {
              setActiveIndex((prev) => {
                if (prev !== index) {
                  // Bump reset counter so carousel resets to slide 0
                  setResetCounter((c) => c + 1);
                }
                return index;
              });

              // Load more when nearing end
              if (index >= projects.length - 3 && hasMore && cursor != null) {
                void loadFeed(cursor, true);
              }
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.7,
      }
    );

    cardRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [projects, cursor, hasMore, loadFeed]);

  // ── Loading / empty states ──

  if (projects.length === 0 && loading) {
    return (
      <div className="fixed inset-x-0 top-14 bottom-0 z-10 flex items-center justify-center bg-black text-white/60 sm:relative sm:inset-auto sm:top-auto sm:bottom-auto sm:min-h-[calc(100vh-3.5rem)] sm:z-auto sm:bg-page sm:text-text-secondary">
        Loading explore feed...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="fixed inset-x-0 top-14 bottom-0 z-10 flex flex-col items-center justify-center gap-3 bg-black px-4 text-center sm:relative sm:inset-auto sm:top-auto sm:bottom-auto sm:min-h-[calc(100vh-3.5rem)] sm:z-auto sm:bg-page">
        <p className="text-white/60 sm:text-text-secondary">No live projects yet.</p>
        <a href="/browse" className="text-sm font-medium text-brand-500 hover:underline">Browse all projects</a>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="brand-halo-bg fixed inset-x-0 top-14 bottom-0 z-10 snap-y snap-mandatory overflow-y-auto bg-black sm:relative sm:inset-auto sm:top-auto sm:bottom-auto sm:h-[calc(100vh-3.5rem)] sm:z-auto"
        role="feed"
        aria-label="Explore AI film projects"
      >
        <h1 className="sr-only">Explore Projects</h1>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-black/45 via-black/15 to-transparent dark:from-black/55 dark:via-black/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-black/65 via-black/25 to-transparent dark:from-black/75 dark:via-black/30" />

        {projects.map((project, index) => (
          <article
            key={project.id}
            data-index={index}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className={`relative h-[calc(100dvh-3.5rem)] snap-start overflow-hidden transition-[opacity,transform,filter] duration-500 ease-out sm:h-[calc(100vh-3.5rem)] ${
              index === activeIndex
                ? "opacity-100 translate-y-0 saturate-100"
                : "opacity-70 translate-y-4 saturate-[0.82]"
            }`}
            aria-label={`Project: ${project.title}`}
          >
            <FeedCarousel
              project={project}
              isActive={index === activeIndex}
              onPreorder={() => setPreorderProject(project)}
              onComment={() => setDiscussionProject(project)}
              resetKey={resetCounter}
            />
          </article>
        ))}

        {!hasMore ? (
          <div className="flex h-40 items-center justify-center text-sm text-text-secondary">
            You&apos;ve seen all projects. Check back soon.
          </div>
        ) : null}
      </div>

      {preorderProject && preorderProject.lifecycle_status !== "teaser" ? (
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

      {discussionProject ? (
        <DiscussionBottomSheet
          open
          onClose={() => setDiscussionProject(null)}
          projectId={discussionProject.id}
          title={discussionProject.title}
          isLoggedIn={Boolean(user)}
        />
      ) : null}
    </>
  );
}
