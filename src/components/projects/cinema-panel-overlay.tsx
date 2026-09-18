"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { CinemaMediaArea } from "@/components/projects/cinema-media-area";
import type { CinemaSlide } from "@/components/projects/cinema-media-area";
import { CinemaInfoPanel } from "@/components/projects/cinema-info-panel";
import { PreorderBottomSheet } from "@/components/projects/preorder-bottom-sheet";
import { DiscussionBottomSheet } from "@/components/feed/discussion-bottom-sheet";
import { useAuth } from "@/hooks/useAuth";
import type { ProjectFeedItem } from "@/components/projects/types";

interface CinemaPanelOverlayProps {
  projects: ProjectFeedItem[];
  startIndex: number;
  status: string;
  onClose: () => void;
}

function buildSlides(project: ProjectFeedItem): CinemaSlide[] {
  const slides: CinemaSlide[] = [];

  // Teaser
  slides.push({
    type: "teaser",
    key: `teaser-${project.id}`,
    label: "Teaser",
    mediaAssetId: project.teaser_asset_id,
    mediaType: project.teaser_asset_id ? "video" : null,
    thumbnailUrl: project.teaser_thumbnail_url,
  });

  // Characters
  const chars = [...(project.character_cards ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  for (const card of chars) {
    slides.push({
      type: "character",
      key: `char-${card.id}`,
      label: `Character: ${card.name}`,
      mediaAssetId: card.media_asset_id,
      mediaType: card.media_type,
      thumbnailUrl: project.teaser_thumbnail_url,
      characterName: card.name,
      characterDescription: card.short_description ?? undefined,
    });
  }

  // Concepts
  const concepts = [...(project.concept_cards ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  for (const card of concepts) {
    const preview = card.caption ? (card.caption.length > 40 ? card.caption.slice(0, 40) + "..." : card.caption) : "Concept";
    slides.push({
      type: "concept",
      key: `concept-${card.id}`,
      label: `Concept: ${preview}`,
      mediaAssetId: card.media_asset_id,
      mediaType: card.media_type,
      thumbnailUrl: project.teaser_thumbnail_url,
      conceptCaption: card.caption ?? undefined,
    });
  }

  // Story
  slides.push({
    type: "story",
    key: `story-${project.id}`,
    label: "Story",
    mediaAssetId: null,
    mediaType: null,
    thumbnailUrl: project.teaser_thumbnail_url,
    synopsis: project.synopsis ?? undefined,
    genre: project.genre ?? undefined,
    tone: project.tone ?? undefined,
    format: project.format ?? undefined,
    runtimeMinutes: project.runtime_minutes ?? undefined,
    inspirationLine: project.inspiration_line ?? undefined,
  });

  // Creator
  slides.push({
    type: "creator",
    key: `creator-${project.id}`,
    label: "Creator",
    mediaAssetId: null,
    mediaType: null,
    thumbnailUrl: project.teaser_thumbnail_url,
    creatorName: project.profiles?.display_name ?? project.creator?.display_name ?? undefined,
    creatorBio: project.creator?.bio ?? undefined,
    creatorAvatarUrl: project.profiles?.avatar_url ?? project.creator?.avatar_url ?? undefined,
  });

  return slides;
}

export function CinemaPanelOverlay({ projects, startIndex, status, onClose }: CinemaPanelOverlayProps) {
  const { user } = useAuth();
  const [projectIndex, setProjectIndex] = useState(startIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [preorderProject, setPreorderProject] = useState<ProjectFeedItem | null>(null);
  const [discussionProject, setDiscussionProject] = useState<ProjectFeedItem | null>(null);

  const project = projects[projectIndex] ?? projects[0];
  const slides = useMemo(() => buildSlides(project), [project]);

  // Lock body scroll + handle browser back button
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Push a history entry so browser back closes the overlay
    window.history.pushState({ cinemaOverlay: true }, "");
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setSlideIndex((prev: number) => Math.max(0, prev - 1));
      else if (e.key === "ArrowRight") setSlideIndex((prev: number) => Math.min(slides.length - 1, prev + 1));
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (projectIndex > 0) {
          setProjectIndex((prev: number) => prev - 1);
          setSlideIndex(0);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (projectIndex < projects.length - 1) {
          setProjectIndex((prev: number) => prev + 1);
          setSlideIndex(0);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, slides.length, projectIndex, projects.length]);

  // Reset slide index when project changes
  useEffect(() => {
    setSlideIndex(0);
  }, [projectIndex]);

  // Mouse wheel on media area → switch projects
  const wheelCooldown = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (wheelCooldown.current) return;
    const threshold = 50;
    if (Math.abs(e.deltaY) < threshold) return;

    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 400);

    if (e.deltaY > 0 && projectIndex < projects.length - 1) {
      setProjectIndex((prev: number) => prev + 1);
      setSlideIndex(0);
    } else if (e.deltaY < 0 && projectIndex > 0) {
      setProjectIndex((prev: number) => prev - 1);
      setSlideIndex(0);
    }
  }, [projectIndex, projects.length]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex bg-black">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Left: Media area (~65%) — scroll wheel switches projects */}
        <div className="relative flex-[65] overflow-hidden" onWheel={handleWheel}>
          <CinemaMediaArea
            slide={slides[slideIndex]}
            teaserAssetId={project.teaser_asset_id}
            teaserThumbnailUrl={project.teaser_thumbnail_url}
            onPrev={() => setSlideIndex((prev: number) => Math.max(0, prev - 1))}
            onNext={() => setSlideIndex((prev: number) => Math.min(slides.length - 1, prev + 1))}
            hasPrev={slideIndex > 0}
            hasNext={slideIndex < slides.length - 1}
          />

          {/* Project navigation (up/down arrows at bottom-left) */}
          {projects.length > 1 && (
            <div className="absolute bottom-4 left-4 z-30 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => { if (projectIndex > 0) { setProjectIndex(projectIndex - 1); setSlideIndex(0); } }}
                disabled={projectIndex === 0}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity disabled:opacity-30"
                aria-label="Previous project"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => { if (projectIndex < projects.length - 1) { setProjectIndex(projectIndex + 1); setSlideIndex(0); } }}
                disabled={projectIndex === projects.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity disabled:opacity-30"
                aria-label="Next project"
              >
                ↓
              </button>
            </div>
          )}
        </div>

        {/* Right: Info panel (~35%) */}
        <div className="flex-[35] border-l border-white/10">
          <CinemaInfoPanel
            project={project}
            slides={slides}
            activeSlideIndex={slideIndex}
            onSlideSelect={setSlideIndex}
            onPreorder={() => setPreorderProject(project)}
            onComment={() => setDiscussionProject(project)}
          />
        </div>
      </div>

      {preorderProject && (
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
      )}

      {discussionProject && (
        <DiscussionBottomSheet
          open
          onClose={() => setDiscussionProject(null)}
          projectId={discussionProject.id}
          title={discussionProject.title}
          isLoggedIn={Boolean(user)}
        />
      )}
    </>
  );
}
