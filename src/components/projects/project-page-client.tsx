"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/creator/follow-button";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import { useAuth } from "@/hooks/useAuth";
import { getYouTubeEmbedUrl } from "@/lib/news";
import {
  formatCreatorDeliverySummary,
  resolveCreatorTrust,
} from "@/lib/creator-trust";
import { cn, formatCount, formatPrice, timeAgo } from "@/lib/utils";
import {
  formatProjectFormat,
  formatProjectGenre,
  formatProjectTone,
  formatRuntime,
  daysUntilDelivery,
  getCardMediaUrl,
  getProjectTeaserUrl,
  isFreeWatchProject,
  lifecyclePrimaryCta,
  lifecycleTrustCopy,
  safeProgress,
} from "@/components/projects/utils";
import { ProjectProgressBar } from "@/components/projects/project-progress-bar";
import { PreorderBottomSheet } from "@/components/projects/preorder-bottom-sheet";
import { LifecycleBadge } from "@/components/projects/lifecycle-badge";
import { ProjectMetaPills } from "@/components/projects/project-meta-pills";
import { getLifecycleVisual, getLifecycleHoverGlow, getLifecycleTabActiveClassName, getLifecycleTextClassName } from "@/components/projects/lifecycle-visuals";
import { PillTabs } from "@/components/ui/pill-tabs";
import { ActionRailButton } from "@/components/ui/action-rail-button";
import { SectionShell } from "@/components/ui/section-shell";
import {
  ProjectMediaRail,
  buildMediaItems,
  type MediaItem,
} from "@/components/projects/project-media-rail";
import { CardDetailOverlay } from "@/components/ui/card-detail-overlay";
import { ProjectDiscussion } from "@/components/projects/project-discussion";
import { ProjectUpdatesFeed } from "@/components/projects/project-updates-feed";
import { TeaserPlayer } from "@/components/projects/teaser-player";
import type {
  ProjectDetailPayload,
  ProjectDiscussionPost,
  FeedCharacterCard,
  FeedConceptCard,
} from "@/components/projects/types";

function PremiereCountdownInline({ premiereAt }: { premiereAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(premiereAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Starting now...");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [premiereAt]);

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-role-warning-fg">Premiere countdown</p>
      <p className="text-lg font-bold tabular-nums text-role-warning-fg">{timeLeft}</p>
      <p className="text-xs text-text-tertiary">
        {new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(premiereAt))}
      </p>
    </div>
  );
}

function RefundButton({ preorderId }: { preorderId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRefund = useCallback(async () => {
    if (status === "loading" || status === "success") return;
    if (!confirm("Are you sure you want to request a refund? This cannot be undone.")) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/preorders/${preorderId}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({ error: "Refund failed" }));
        setErrorMsg(data.error ?? "Refund failed");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error — please try again");
      setStatus("error");
    }
  }, [preorderId, status]);

  if (status === "success") {
    return (
      <p className="rounded-lg border border-role-success-border bg-role-success-bg px-3 py-2 text-sm font-medium text-role-success-fg">
        Refund requested successfully. You will receive your refund shortly.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRefund}
        disabled={status === "loading"}
        className="w-full rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-sm font-medium text-role-danger-fg transition-colors hover:bg-role-danger-bg/80 disabled:opacity-50"
      >
        {status === "loading" ? "Processing…" : "Request Refund"}
      </button>
      {status === "error" ? (
        <p className="mt-1 text-xs text-role-danger-fg">{errorMsg}</p>
      ) : null}
    </div>
  );
}

const TABS = ["story", "updates", "characters", "concept", "discussion", "creator"] as const;
type ProjectTab = (typeof TABS)[number];

function normalizeTab(value: string | null): ProjectTab {
  if (!value) return "story";
  return (TABS.includes(value as ProjectTab) ? value : "story") as ProjectTab;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Campaign ending soon";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${Math.max(mins, 1)}m remaining`;
}

interface ProjectPageClientProps {
  slugOrId: string;
}

export function ProjectPageClient({ slugOrId }: ProjectPageClientProps) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<ProjectTab>(normalizeTab(searchParams.get("tab")));
  const tabsRef = useRef<HTMLDivElement>(null);

  const [detail, setDetail] = useState<ProjectDetailPayload | null>(null);
  const [discussion, setDiscussion] = useState<ProjectDiscussionPost[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [interested, setInterested] = useState(false);
  const [preorderOpen, setPreorderOpen] = useState(false);
  const [bottomSheetMode, setBottomSheetMode] = useState<"preorder" | "purchase">("preorder");

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedCharCard, setSelectedCharCard] = useState<FeedCharacterCard | null>(null);
  const [selectedConceptCard, setSelectedConceptCard] = useState<FeedConceptCard | null>(null);
  const currentLocation =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : `/project/${slugOrId}`;

  const project = detail?.project ?? null;
  const creatorTrust = useMemo(
    () =>
      resolveCreatorTrust({
        isFoundingCreator: project?.profiles?.is_founding_creator,
        releasedProjectCount: project?.profiles?.released_project_count,
      }),
    [project?.profiles?.is_founding_creator, project?.profiles?.released_project_count]
  );
  const creatorDeliverySummary = useMemo(
    () => formatCreatorDeliverySummary(creatorTrust),
    [creatorTrust]
  );
  const teaserVideoUrl = useMemo(() => getProjectTeaserUrl(project?.teaser_asset_id ?? null), [project?.teaser_asset_id]);
  const externalTeaserEmbedUrl = useMemo(
    () => getYouTubeEmbedUrl(project?.external_teaser_url ?? null),
    [project?.external_teaser_url]
  );
  const progress = useMemo(
    () => safeProgress(project?.preorder_count_cache ?? 0, project?.unlock_target ?? null),
    [project?.preorder_count_cache, project?.unlock_target]
  );

  const cdnHost = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME ?? null;
  const mediaItems: MediaItem[] = useMemo(() => {
    if (!detail) return [];
    return buildMediaItems(
      project?.teaser_thumbnail_url ?? null,
      detail.characters ?? [],
      detail.concepts ?? [],
      cdnHost
    );
  }, [detail, project?.teaser_thumbnail_url, cdnHost]);

  const activeMedia = mediaItems[activeMediaIndex] ?? null;
  const refreshDiscussionCount = useCallback(async (projectId: string) => {
    const response = await fetch(`/api/projects/${projectId}/discussion?sort=newest`);
    const payload = (await response.json()) as { posts?: ProjectDiscussionPost[] };
    if (response.ok) {
      setDiscussion(payload.posts ?? []);
    }
  }, []);

  const refreshProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${slugOrId}`);
      const payload = (await response.json()) as ProjectDetailPayload & { error?: string };

      if (!response.ok || !payload.project) {
        throw new Error(payload.error ?? "Project not found");
      }

      setDetail(payload);
      setLiked(Boolean(payload.hasLiked));
      setInterested(Boolean(payload.hasInterested));

      await refreshDiscussionCount(payload.project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [refreshDiscussionCount, slugOrId]);

  useEffect(() => {
    setTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    void refreshProject();
  }, [refreshProject]);

  const handleLike = useCallback(async () => {
    if (!project) return;
    setLiked((prev) => !prev);
    await fetch(`/api/projects/${project.id}/like`, { method: "POST" }).catch(() => undefined);
  }, [project]);

  const handleSave = useCallback(async () => {
    if (!project) return;
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(currentLocation)}`;
      return;
    }
    setSaved((prev) => !prev);
    try {
      const res = await fetch(`/api/projects/${project.id}/save`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.saved === "boolean") setSaved(data.saved);
      }
    } catch {
      setSaved((prev) => !prev);
    }
  }, [currentLocation, project, user]);

  const handleInterest = useCallback(async () => {
    if (!project) return;
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(currentLocation)}`;
      return;
    }
    setInterested((prev) => !prev);
    try {
      const res = await fetch(`/api/projects/${project.id}/interest`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.interested === "boolean") setInterested(data.interested);
      }
    } catch {
      setInterested((prev) => !prev);
    }
  }, [currentLocation, project, user]);

  const handleShare = useCallback(async () => {
    if (!project) return;

    const href = `${window.location.origin}/project/${project.slug ?? project.id}`;

    fetch(`/api/projects/${project.id}/share`, { method: "POST" }).catch(() => undefined);

    if (navigator.share) {
      try {
        await navigator.share({
          title: project.title,
          text: project.hook ?? "Check out this AI film project on Myriad Spring",
          url: href,
        });
        return;
      } catch {
        // User cancelled or API unavailable — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(href);
      setShareFeedback("Link copied!");
    } catch {
      setShareFeedback("Copy failed");
    }
    setTimeout(() => setShareFeedback(null), 2000);
  }, [project]);

  const hasAccess = detail?.hasPreordered || detail?.hasPurchased;
  const isCreator = user?.id === project?.creator_id;
  const isFreeWatch = project ? isFreeWatchProject(project.lifecycle_status, project.release_price_cents) : false;
  const hasWatchAccess = hasAccess || isFreeWatch;

  const isTestProject = Boolean((project as Record<string, unknown> | null)?.is_test);

  const handlePrimaryAction = useCallback(() => {
    if (!project) return;
    if (isTestProject) return; // Block all payment actions for test projects

    if (project.lifecycle_status === "teaser") {
      setActiveMediaIndex(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Creator can always watch their own premiering/released film
    if (isCreator) {
      if ((project.lifecycle_status === "premiering" || project.lifecycle_status === "released") && project.film_video_id) {
        window.location.href = `/watch/${project.film_video_id}`;
      }
      return;
    }

    // Preorder flow: unlocking or in_production (preorders stay open)
    if (project.lifecycle_status === "unlocking" || project.lifecycle_status === "in_production") {
      if (!detail?.hasPreordered) {
        setBottomSheetMode("preorder");
        setPreorderOpen(true);
      }
      return;
    }

    // Post-release purchase or watch flow
    if (project.lifecycle_status === "premiering" || project.lifecycle_status === "released") {
      if ((hasAccess || isFreeWatch) && project.film_video_id) {
        window.location.href = `/watch/${project.film_video_id}`;
      } else if (!hasAccess && !isFreeWatch) {
        setBottomSheetMode("purchase");
        setPreorderOpen(true);
      }
    }
  }, [detail?.hasPreordered, hasAccess, isCreator, isFreeWatch, isTestProject, project]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="skeleton-shimmer aspect-video rounded-2xl" />
        <div className="mt-4 space-y-2">
          <div className="skeleton-shimmer h-7 w-2/3 rounded" />
          <div className="skeleton-shimmer h-5 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          icon="🎬"
          title="Project not found"
          description={error ?? "This project may be private or unavailable."}
          actionLabel="Back to Browse"
          actionHref="/browse"
        />
      </div>
    );
  }

  const primaryLabel = lifecyclePrimaryCta(project.lifecycle_status, {
    priceCents: project.preorder_price_cents,
    releasePriceCents: project.release_price_cents,
    hasPreordered: detail?.hasPreordered,
    hasPurchased: detail?.hasPurchased,
  });

  const trustCopy = lifecycleTrustCopy(project.lifecycle_status, {
    releasePriceCents: project.release_price_cents,
  });
  const lifecycleLabel = getLifecycleVisual(project.lifecycle_status).label;
  const isTeaserMode = project.lifecycle_status === "teaser";
  const isProductionLaunch = project.launch_mode === "production";
  const supportsUnlockGoal = project.launch_mode === "preorder";
  const isWatchMode = project.lifecycle_status === "premiering" || project.lifecycle_status === "released";
  const isBackEarlyMode = project.lifecycle_status === "unlocking" || project.lifecycle_status === "in_production";
  const viewerCount = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
  const premiereAt = detail?.premiere?.premiere_scheduled_at || project.premiere_date;
  const tabItems = TABS.map((key) => ({
    value: key,
    label: key === "discussion" ? "Discussion" : key.slice(0, 1).toUpperCase() + key.slice(1),
    count: key === "discussion" ? discussion.length : undefined,
  }));
  const modeEyebrow = isTeaserMode
    ? "Teaser Project"
    : isWatchMode
    ? project.lifecycle_status === "premiering"
      ? "Watch Mode"
      : "Available Now"
    : "Seed";
  const modeHeadline = isTeaserMode
    ? "Explore the teaser before it becomes a full launch."
    : isWatchMode
    ? project.lifecycle_status === "premiering"
      ? detail?.premiere?.is_premiere_live
        ? "Premiere is live right now."
        : premiereAt
          ? "Premiere access is opening soon."
          : "Premiere access is coming soon."
      : "This film is ready to watch now."
    : project.lifecycle_status === "unlocking"
      ? "Seed it while the outcome is still being decided."
      : "Production is live and preorders are still open.";
  const modeBody = isTeaserMode
    ? "This project is live as a teaser page only. Watch the concept clip, explore the story, characters, and world, then save it if you want to see it turn into a preorder campaign or production launch."
    : isWatchMode
    ? project.lifecycle_status === "premiering"
      ? hasAccess
        ? "You already have access. Jump straight into the premiere when the room opens, then come back here for the story, updates, and creator context."
        : isFreeWatch
          ? "This premiere is free to watch. Jump in as soon as the room opens, then come back here for the story, updates, and creator context."
        : "Buy access now so you can jump straight into the premiere and the finished film when it is released."
      : hasAccess
        ? "You already have access to the finished film. Watch now, then dive back into the project page for story, characters, and production history."
        : isFreeWatch
          ? "The film is finished and free to watch now on Myriad. Hit play and then come back here for the story, characters, and production history."
        : "The film is finished and available now on Myriad. Buy access and go straight to the watch page."
    : project.lifecycle_status === "unlocking"
      ? "Seed now to help decide whether this film gets made. If it misses its goal, your preorder is refunded automatically."
      : isProductionLaunch
        ? "The creator has already committed to make this film. Preorder now to watch first when the premiere is scheduled."
        : "The project is already in production and preorders stay open until the creator schedules the premiere.";
  const modeFacts = isTeaserMode
    ? [
        teaserVideoUrl ? "Teaser ready to watch" : "Concept page live",
        `${formatCount(project.like_count_cache ?? 0)} likes`,
        `${formatCount(project.discussion_count_cache ?? 0)} discussion posts`,
      ]
    : isWatchMode
    ? [
        project.lifecycle_status === "premiering" && premiereAt
          ? `Premieres ${new Date(premiereAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
          : project.delivered_at
            ? `Released ${new Date(project.delivered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "Available on Myriad",
        viewerCount > 0 ? `${viewerCount.toLocaleString()} viewers` : "Watchable now",
        hasAccess
          ? "You already have access"
          : isFreeWatch
            ? project.lifecycle_status === "premiering"
              ? "Premiere opens free"
              : "Free to watch"
            : "Purchase opens watch instantly",
      ]
    : [
        project.lifecycle_status === "unlocking" && project.unlock_target
          ? `${project.preorder_count_cache.toLocaleString()} / ${project.unlock_target.toLocaleString()} preorders`
          : `${project.preorder_count_cache.toLocaleString()} early backers`,
        project.lifecycle_status === "unlocking" && progress >= 50
          ? "Creator can greenlight now"
          : project.lifecycle_status === "unlocking"
            ? "Refund if it misses"
            : "Preorders stay open through production",
        project.delivery_deadline
          ? `Delivery target ${new Date(project.delivery_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : project.production_window_days
            ? `${project.production_window_days} day production window`
            : "Production timeline set by creator",
      ];
  const primaryActionDisabled =
    isTestProject ||
    (detail?.hasPreordered && (project.lifecycle_status === "unlocking" || project.lifecycle_status === "in_production")) ||
    (hasWatchAccess && !project.film_video_id && (project.lifecycle_status === "premiering" || project.lifecycle_status === "released"));

  return (
    <>
      <div className="mx-auto max-w-6xl overflow-hidden px-0 py-0 pb-32 sm:px-4 sm:py-8 sm:pb-24 lg:pb-8">
        {isTestProject && (
          <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-300/90">
            <span className="font-semibold text-amber-400">Sample Project</span> — This is a demo project for testing purposes. Preorders and payments are disabled.
          </div>
        )}
        <section className="brand-edge-line surface-edge-glow relative overflow-hidden sm:rounded-2xl sm:border sm:border-border bg-surface">
          {/* Hero area — film player (if accessible), teaser, or character/concept */}
          {hasWatchAccess && project.film_video_id && (project.lifecycle_status === "premiering" || project.lifecycle_status === "released") ? (
            /* Released/premiering film with access — prominent play hero */
            <div className="relative aspect-video w-full bg-role-bg-canvas">
              {project.teaser_thumbnail_url ? (
                <img
                  src={project.teaser_thumbnail_url}
                  alt={project.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-surface to-page" />
              )}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
                <Link
                  href={`/watch/${project.film_video_id}`}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 transition-transform hover:scale-110"
                >
                  <Play size={36} className="text-white ml-1" fill="white" />
                </Link>
                <p className="text-lg font-semibold text-white">
                  {project.lifecycle_status === "premiering" ? "Watch Premiere" : isFreeWatch && !hasAccess ? "Watch Free" : "Watch Now"}
                </p>
              </div>
              <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-8 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-sm text-white/80">{project.title}</p>
                <p className="text-xs text-white/60">
                  {project.profiles?.display_name ?? "Unknown creator"}
                  {project.delivered_at ? ` · Released ${new Date(project.delivered_at).toLocaleDateString()}` : ""}
                </p>
              </div>
            </div>
          ) : !activeMedia || activeMedia.type === "teaser" ? (
            <div className="aspect-video w-full bg-role-bg-canvas">
              {teaserVideoUrl ? (
                <TeaserPlayer
                  src={teaserVideoUrl}
                  poster={project.teaser_thumbnail_url}
                  fit="cover"
                  defaultMuted={muted}
                  onMutedChange={setMuted}
                />
              ) : externalTeaserEmbedUrl ? (
                <iframe
                  src={externalTeaserEmbedUrl}
                  title={project.title}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <TeaserPlayer
                  src={null}
                  poster={project.teaser_thumbnail_url}
                  fit="cover"
                  defaultMuted={muted}
                  onMutedChange={setMuted}
                />
              )}
            </div>
          ) : (
            <div className="relative aspect-video w-full">
              {activeMedia.mediaType === "video" && activeMedia.mediaAssetId ? (
                <video
                  key={activeMedia.mediaAssetId}
                  src={getCardMediaUrl(activeMedia.mediaAssetId, "video") ?? undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : activeMedia.thumbnailUrl ? (
                <img
                  src={activeMedia.thumbnailUrl}
                  alt={activeMedia.label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface text-text-tertiary">
                  No media
                </div>
              )}

              {/* Overlay with name/caption */}
              <div className="media-overlay-gradient absolute inset-x-0 bottom-0 px-4 pb-4 pt-16">
                {activeMedia.type === "character" ? (
                  <>
                    <p className="text-xl font-bold text-white">{activeMedia.name}</p>
                    {activeMedia.description ? (
                      <p className="mt-1 line-clamp-2 text-base text-white/80">{activeMedia.description}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="line-clamp-2 text-base text-white/80">
                    {activeMedia.caption ?? activeMedia.label}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Watch button for non-access users on released/premiering (small) */}
          {!hasWatchAccess && (project.lifecycle_status === "premiering" || project.lifecycle_status === "released") && project.film_video_id ? (
            <Link
              href={`/watch/${project.film_video_id}`}
              className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg bg-role-bg-overlay-soft px-3 py-2 text-sm text-white"
            >
              <Play size={16} /> Watch
            </Link>
          ) : null}
        </section>

        {/* Media rail — desktop only, hidden if no character/concept cards */}
        <ProjectMediaRail
          items={mediaItems}
          activeIndex={activeMediaIndex}
          onSelect={setActiveMediaIndex}
        />

        <div className="mt-4 grid gap-5 px-4 sm:mt-5 sm:px-0 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="min-w-0 space-y-4">
            <header className="space-y-2">
              <div className="flex items-center gap-2">
                <LifecycleBadge status={project.lifecycle_status} showDot />
                {project.content_rating && project.content_rating !== "general" ? (
                  <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide backdrop-blur-md ${
                    project.content_rating === "mature"
                      ? "border border-red-500/40 bg-red-500/20 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                      : "border border-amber-500/40 bg-amber-500/20 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                  }`}>
                    {project.content_rating === "mature" ? "R" : "PG-13"}
                  </span>
                ) : null}
              </div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{project.title}</h1>
              <p className="text-text-secondary">{project.hook ?? "Unreleased AI film project"}</p>
              <ProjectMetaPills
                genre={project.genre}
                format={project.format}
                tone={project.tone}
                runtimeMinutes={project.runtime_minutes}
              />
            </header>

            {/* Creator byline */}
            {project.profiles ? (
              <div className="flex items-center gap-3">
                <Link href={`/creator/${project.profiles.username}`} className="flex items-center gap-3 min-w-0 group">
                  {project.profiles.avatar_url ? (
                    <img
                      src={project.profiles.avatar_url}
                      alt={project.profiles.display_name ?? "Creator"}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-medium">
                      {(project.profiles.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold group-hover:text-brand-500 transition-colors">
                      {project.profiles.display_name ?? "Unknown creator"}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">@{project.profiles.username}</p>
                    <CreatorTrustBadges trust={creatorTrust} className="mt-1" />
                    <p className="mt-1 truncate text-[11px] text-text-tertiary">
                      {creatorDeliverySummary}
                    </p>
                  </div>
                </Link>
                {project.profiles.id && (!user || user.id !== project.creator_id) ? (
                  <FollowButton creatorId={project.profiles.id} />
                ) : null}
              </div>
            ) : null}

            {(isTeaserMode || isWatchMode || isBackEarlyMode) ? (
              <section
                className={cn(
                  "surface-edge-glow rounded-2xl border p-4 sm:p-5",
                  project.lifecycle_status === "teaser" && "border-white/20 bg-white/[0.03]",
                  project.lifecycle_status === "unlocking" && "border-teal-400/25 bg-teal-500/[0.05]",
                  project.lifecycle_status === "in_production" && "border-purple-500/25 bg-purple-500/[0.05]",
                  project.lifecycle_status === "premiering" && "border-amber-500/25 bg-amber-500/[0.05]",
                  project.lifecycle_status === "released" && "border-green-500/25 bg-green-500/[0.05]"
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${getLifecycleTextClassName(project.lifecycle_status)}`}>
                        {modeEyebrow}
                      </p>
                      <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
                        {modeHeadline}
                      </h2>
                      <p className="max-w-3xl text-sm leading-6 text-text-secondary">
                        {modeBody}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {modeFacts.map((fact) => (
                        <span
                          key={fact}
                          className="rounded-full border border-border bg-page/80 px-3 py-1.5 text-xs text-text-secondary"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[260px]">
                    {isCreator ? (
                      <>
                        {(project.lifecycle_status === "premiering" || project.lifecycle_status === "released") && project.film_video_id ? (
                          <Button className="w-full press-effect" onClick={handlePrimaryAction}>
                            {project.lifecycle_status === "premiering" ? "Watch Premiere" : "Watch Now"}
                          </Button>
                        ) : null}
                        <Link href={`/projects/new?edit=${project.id}`}>
                          <Button variant="secondary" className="w-full">Edit Project</Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Button className="w-full press-effect" onClick={handlePrimaryAction} disabled={primaryActionDisabled}>
                          {primaryLabel}
                        </Button>
                        {trustCopy ? (
                          <p className="text-center text-xs leading-5 text-text-tertiary">
                            {trustCopy}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {/* Mobile action row — interest, like, discuss, share */}
            <div className="flex items-center gap-4 lg:hidden">
              {(project.lifecycle_status === "teaser" || project.lifecycle_status === "unlocking") ? (
                <button
                  type="button"
                  onClick={() => void handleInterest()}
                  className={`inline-flex items-center gap-1.5 text-sm transition-colors ${interested ? "text-amber-400" : "text-text-secondary"}`}
                >
                  <Sparkles size={16} className={interested ? "fill-current" : ""} />
                  {formatCount(project.interest_count_cache ?? 0)}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleLike}
                className={`inline-flex items-center gap-1.5 text-sm ${liked ? "text-role-danger-fg" : "text-text-secondary"} transition-colors`}
              >
                <Heart size={16} className={liked ? "fill-current" : ""} />
                {formatCount(project.like_count_cache)}
              </button>
              <button
                type="button"
                onClick={() => { setTab("discussion"); tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors"
              >
                <MessageCircle size={16} />
                {formatCount(project.discussion_count_cache)}
              </button>
              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors"
              >
                <Share2 size={16} />
                Share
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                className={`inline-flex items-center gap-1.5 text-sm transition-colors ${saved ? "text-brand-500" : "text-text-secondary"}`}
              >
                {saved ? <BookmarkCheck size={16} className="fill-current" /> : <Bookmark size={16} />}
                {saved ? "Saved" : "Save"}
              </button>
              {shareFeedback ? (
                <span className="text-xs text-text-secondary animate-in fade-in">{shareFeedback}</span>
              ) : null}
            </div>

            {/* Episode list for series */}
            {detail?.episodes && detail.episodes.length > 0 && (
              <div className="surface-edge-glow rounded-xl border border-border bg-page-secondary overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="font-display text-base font-semibold">
                    Season 1 &middot; {detail.episodes.length} Episodes
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {detail.episodes.map((ep) => {
                    const hasPremiered = ep.premiere_ended || (ep.premiere_scheduled_at && new Date(ep.premiere_scheduled_at) <= new Date());
                    const isLive = ep.is_premiere_live;
                    return (
                      <div key={ep.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-role-bg-overlay-soft text-sm font-medium text-text-secondary">
                            {ep.episode_number}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{ep.title || `Episode ${ep.episode_number}`}</p>
                            {ep.premiere_scheduled_at && !hasPremiered && (
                              <p className="text-xs text-text-tertiary">
                                Premieres {new Date(ep.premiere_scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 ml-3">
                          {isLive ? (
                            <a href={`/watch/${ep.video_id}`} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black press-effect">
                              Watch Premiere
                            </a>
                          ) : hasPremiered && ep.video_id ? (
                            <a href={`/watch/${ep.video_id}`} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white press-effect">
                              Watch
                            </a>
                          ) : (
                            <span className="rounded-lg bg-role-bg-overlay-soft px-3 py-1.5 text-xs text-text-tertiary">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pre-delivery episode count label */}
            {project.format === "series" && project.episode_count && !detail?.episodes?.length && (
              <div className="rounded-xl bg-page-secondary border border-border px-4 py-3 text-sm text-text-secondary">
                Season 1 &middot; {project.episode_count} Episodes
              </div>
            )}

            <div ref={tabsRef} className="sticky top-14 z-10 -mx-1 border-y border-border bg-page/90 py-2 backdrop-blur">
              <div className="relative">
                <div className="overflow-x-auto px-2 scrollbar-hide">
                  <PillTabs
                    tabs={tabItems}
                    value={tab}
                    onValueChange={(value) => setTab(value as ProjectTab)}
                    activeClassName={getLifecycleTabActiveClassName(project.lifecycle_status)}
                  />
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-page/90 to-transparent sm:hidden" />
              </div>
            </div>

            <div className="space-y-4 animate-in fade-in duration-300">
              {tab === "concept" ? (
                <div className="space-y-4">
                  {project.lifecycle_status === "in_production" || project.lifecycle_status === "premiering" || project.lifecycle_status === "released" ? (
                    <div className="surface-edge-glow rounded-xl border border-border bg-page-secondary p-4">
                      <h3 className="text-sm font-semibold">Production Updates</h3>
                      <p className="mt-2 text-sm text-text-secondary">
                        Follow along with the creator&apos;s production journey.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setTab("updates"); tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                        className="mt-2 text-sm font-medium text-brand-500 hover:underline"
                      >
                        View updates &rarr;
                      </button>
                    </div>
                  ) : null}

                  {detail?.concepts?.length ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {detail.concepts.map((card) => (
                        <button
                          type="button"
                          key={card.id}
                          onClick={() => setSelectedConceptCard(card)}
                          className="group/card w-72 shrink-0 overflow-hidden rounded-xl border border-border bg-page-secondary text-left transition-all duration-300 hover:-translate-y-1 hover:rotate-[0.5deg] hover:shadow-lg hover:shadow-brand-500/10 active:scale-[0.98]"
                        >
                          {card.media_asset_id ? (
                            <img
                              src={card.media_type === "video"
                                ? (getCardMediaUrl(card.media_asset_id, "image") ?? card.media_asset_id)
                                : card.media_asset_id}
                              alt={card.caption ?? "Concept card"}
                              className="aspect-video w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                            />
                          ) : (
                            <div className="aspect-video w-full bg-surface flex items-center justify-center">
                              <div className="flex flex-col items-center gap-1 text-text-tertiary">
                                <svg className="h-8 w-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <path d="m21 15-5-5L5 21" />
                                </svg>
                                <span className="text-xs opacity-50">No image</span>
                              </div>
                            </div>
                          )}
                          <div className="p-3 text-sm text-text-secondary line-clamp-2">{card.caption ?? "Untitled concept"}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon="🧩"
                      title="No concept cards yet"
                      description="The creator will add concept and world cards soon."
                    />
                  )}
                </div>
              ) : null}

              {tab === "characters" ? (
                detail?.characters?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detail.characters.map((card) => (
                      <button
                        type="button"
                        key={card.id}
                        onClick={() => setSelectedCharCard(card)}
                        className="group/card overflow-hidden rounded-xl border border-border bg-page-secondary text-left transition-all duration-300 hover:-translate-y-1 hover:rotate-[0.5deg] hover:shadow-lg hover:shadow-brand-500/10 active:scale-[0.98]"
                      >
                        {card.media_asset_id ? (
                          <img
                            src={card.media_type === "video"
                              ? (getCardMediaUrl(card.media_asset_id, "image") ?? card.media_asset_id)
                              : card.media_asset_id}
                            alt={card.name}
                            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                          />
                        ) : (
                          <div className="aspect-[4/3] w-full bg-surface flex items-center justify-center">
                            <div className="flex flex-col items-center gap-1 text-text-tertiary">
                              <svg className="h-8 w-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              <span className="text-xs opacity-50">No image</span>
                            </div>
                          </div>
                        )}
                        <div className="space-y-1 p-3">
                          <h3 className="font-semibold">{card.name}</h3>
                          <p className="text-sm text-text-secondary line-clamp-2 sm:line-clamp-3">{card.short_description ?? "No description"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="🧑"
                    title="No character cards yet"
                    description="Character reveals will appear here."
                  />
                )
              ) : null}

              {tab === "story" ? (
                <SectionShell title="Story" className="space-y-3">
                  <div>
                    <p
                      className={`text-sm text-text-secondary transition-all duration-300 ${
                        synopsisExpanded ? "" : "line-clamp-4 sm:line-clamp-none"
                      }`}
                    >
                      {project.synopsis ?? "Synopsis coming soon."}
                    </p>
                    {project.synopsis ? (
                      <button
                        type="button"
                        onClick={() => setSynopsisExpanded((prev) => !prev)}
                        className="mt-1 text-xs font-medium text-text-tertiary hover:text-text-primary sm:hidden"
                      >
                        {synopsisExpanded ? "Show less" : "Read more"}
                      </button>
                    ) : null}
                  </div>

                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-surface p-3">
                      <dt className="text-xs uppercase text-text-tertiary">Genre</dt>
                      <dd className="mt-1">{formatProjectGenre(project.genre)}</dd>
                    </div>
                    <div className="rounded-lg bg-surface p-3">
                      <dt className="text-xs uppercase text-text-tertiary">Tone</dt>
                      <dd className="mt-1">{formatProjectTone(project.tone)}</dd>
                    </div>
                    <div className="rounded-lg bg-surface p-3">
                      <dt className="text-xs uppercase text-text-tertiary">Format</dt>
                      <dd className="mt-1">{formatProjectFormat(project.format)}</dd>
                    </div>
                    <div className="rounded-lg bg-surface p-3">
                      <dt className="text-xs uppercase text-text-tertiary">Runtime</dt>
                      <dd className="mt-1">{formatRuntime(project.runtime_minutes) ?? "TBD"}</dd>
                    </div>
                  </dl>

                  {project.inspiration_line ? (
                    <blockquote className="rounded-lg border border-border bg-surface px-3 py-2 text-sm italic text-text-secondary">
                      “{project.inspiration_line}”
                    </blockquote>
                  ) : null}

                </SectionShell>
              ) : null}

              {tab === "updates" ? (
                <div className="surface-edge-glow rounded-xl border border-border bg-page-secondary p-4">
                  <h3 className="mb-3 text-lg font-semibold">Production Updates</h3>
                  <ProjectUpdatesFeed projectId={project.id} creatorId={project.creator_id} />
                </div>
              ) : null}

              {tab === "creator" ? (
                <div className="surface-edge-glow space-y-4 rounded-xl border border-border bg-page-secondary p-4">
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/creator/${project.profiles?.username}`} className="flex items-center gap-3 group">
                      {project.profiles?.avatar_url ? (
                        <img
                          src={project.profiles.avatar_url}
                          alt={project.profiles.display_name ?? "Creator"}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-xl">
                          {(project.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-semibold group-hover:text-brand-500 transition-colors">{project.profiles?.display_name ?? "Unknown creator"}</p>
                        <p className="text-sm text-text-tertiary">@{project.profiles?.username ?? "creator"}</p>
                        <CreatorTrustBadges trust={creatorTrust} className="mt-2" size="md" />
                      </div>
                    </Link>

                    {project.profiles?.id ? <FollowButton creatorId={project.profiles.id} /> : null}
                  </div>

                  {project.profiles?.bio ? (
                    <p className="text-sm text-text-secondary leading-relaxed">{project.profiles.bio}</p>
                  ) : null}

                  <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary">
                    {creatorTrust.verifiedDelivery
                      ? `Delivery record: ${creatorDeliverySummary} on Myriad.`
                      : "New creator — no released work on Myriad yet."}
                  </div>

                  <Link href={`/creator/${project.profiles?.username}`} className="inline-block text-sm text-text-secondary hover:text-text-primary">
                    View all projects →
                  </Link>
                </div>
              ) : null}

              {tab === "discussion" ? (
                <ProjectDiscussion projectId={project.id} isLoggedIn={!!user} />
              ) : null}
            </div>
          </div>

          <aside className={cn(
            "hidden lg:block surface-edge-glow space-y-3 rounded-xl border border-border border-t-2 bg-page-secondary p-4 lg:sticky lg:top-20",
            project.lifecycle_status === "teaser" && "border-t-white/70",
            project.lifecycle_status === "unlocking" && "border-t-teal-400",
            project.lifecycle_status === "in_production" && "border-t-purple-500",
            project.lifecycle_status === "premiering" && "border-t-amber-500",
            project.lifecycle_status === "released" && "border-t-green-500",
          )}>
            <div className="flex items-center gap-2">
              <LifecycleBadge status={project.lifecycle_status} className="w-fit" showDot />
              {project.content_rating && project.content_rating !== "general" ? (
                <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide backdrop-blur-md ${
                  project.content_rating === "mature"
                    ? "border border-red-500/40 bg-red-500/20 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                    : "border border-amber-500/40 bg-amber-500/20 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                }`}>
                  {project.content_rating === "mature" ? "R" : "PG-13"}
                </span>
              ) : null}
            </div>

            {(project.lifecycle_status === "unlocking" || project.lifecycle_status === "failed_to_unlock") && project.unlock_target ? (
              <div>
                <ProjectProgressBar value={progress} vibrant status={project.lifecycle_status} />
                <div className="mt-2 flex items-center justify-between">
                  <p className={`text-sm font-medium ${getLifecycleTextClassName(project.lifecycle_status)}`}>
                    {project.preorder_count_cache.toLocaleString()} / {project.unlock_target.toLocaleString()} preorders
                  </p>
                  <span className={`text-sm font-semibold ${progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : progress >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>
                    {Math.round(progress)}%
                  </span>
                </div>
                {project.lifecycle_status === "unlocking" && progress < 100 ? (
                  <p className={`mt-1 text-xs ${progress >= 50 ? "text-amber-600 dark:text-amber-400" : "text-text-tertiary"}`}>
                    {progress >= 50
                      ? "Creator can approve at 50%+ to start production"
                      : "Needs 50% before creator can approve"}
                  </p>
                ) : null}
                {project.lifecycle_status === "unlocking" ? (
                  <>
                    <p className="text-xs text-text-tertiary">{formatDeadline(project.campaign_ends_at)}</p>
                    {project.campaign_ends_at ? (
                      <p className="text-xs text-text-tertiary">
                        Campaign ends {new Date(project.campaign_ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {project.lifecycle_status === "teaser" ? (
              <div className="space-y-1 rounded-lg bg-surface p-3 text-sm text-text-secondary">
                <p className={`font-medium ${getLifecycleTextClassName(project.lifecycle_status)}`}>
                  Teaser project is live
                </p>
                <p>{formatCount(project.like_count_cache ?? 0)} likes</p>
                <p>{formatCount(project.discussion_count_cache ?? 0)} discussion posts</p>
                <p>{formatCount(project.save_count_cache ?? 0)} saves</p>
              </div>
            ) : null}

            {project.lifecycle_status === "in_production" ? (() => {
              const pp = project.production_progress ?? 0;
              const daysLeft = daysUntilDelivery(project.delivery_deadline);
              return (
                <div className="space-y-1 rounded-lg bg-surface p-3 text-sm text-text-secondary">
                  <p className="font-medium text-text-primary">
                    {isProductionLaunch ? "Direct to Production" : "Unlocked ✓"}
                  </p>
                  {pp > 0 ? (
                    <div className="space-y-1">
                      <ProjectProgressBar value={pp} vibrant status={project.lifecycle_status} />
                      <p className={`font-medium ${getLifecycleTextClassName(project.lifecycle_status)}`}>
                        In Progress · {pp}%
                      </p>
                    </div>
                  ) : (
                    <p className={`font-medium ${getLifecycleTextClassName(project.lifecycle_status)}`}>
                      In Progress
                    </p>
                  )}
                  {project.delivery_deadline ? (
                    <div className="space-y-0.5">
                      {project.is_overdue ? (
                        <>
                          <p className="text-role-danger-fg font-medium">Delivery overdue</p>
                          <p><span className="line-through text-text-tertiary">{new Date(project.delivery_deadline).toLocaleDateString()}</span></p>
                        </>
                      ) : (
                        <p>Delivery by: {new Date(project.delivery_deadline).toLocaleDateString()}
                          {daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft}d left` : ""}
                        </p>
                      )}
                      {project.estimated_delivery_at && project.estimated_delivery_at !== project.delivery_deadline ? (
                        <p className="text-xs text-text-tertiary">
                          Original: <span className="line-through">{new Date(project.estimated_delivery_at).toLocaleDateString()}</span>
                          {" → "}Extended
                        </p>
                      ) : null}
                    </div>
                  ) : project.estimated_delivery_at ? (
                    <p>Estimated delivery: {new Date(project.estimated_delivery_at).toLocaleDateString()}</p>
                  ) : null}
                </div>
              );
            })() : null}

            {project.lifecycle_status === "in_production" && project.is_overdue && detail?.hasPreordered && detail.userPreorderId ? (
              <RefundButton preorderId={detail.userPreorderId} />
            ) : null}

            {(project.lifecycle_status === "premiering" || project.lifecycle_status === "released") ? (() => {
              const viewers = (project.preorder_count_cache ?? 0) + (project.purchase_count_cache ?? 0);
              const premiereAt = detail?.premiere?.premiere_scheduled_at || project.premiere_date;
              return (
                <div className="space-y-1 rounded-lg bg-surface p-3 text-sm text-text-secondary">
                  {project.lifecycle_status === "released" ? (
                    <p className={`font-medium ${getLifecycleTextClassName(project.lifecycle_status)}`}>
                      ✓ Released · {viewers.toLocaleString()} viewers
                    </p>
                  ) : (
                    <>
                      {premiereAt && !(detail?.premiere?.premiere_ended) ? (
                        detail?.premiere?.is_premiere_live ? (
                          <span className="font-medium text-role-success-fg">Live now</span>
                        ) : (
                          <PremiereCountdownInline premiereAt={premiereAt} />
                        )
                      ) : (
                        "Premiere coming soon."
                      )}
                      {viewers > 0 && (
                        <p className="text-xs text-text-tertiary">{viewers.toLocaleString()} viewers</p>
                      )}
                    </>
                  )}
                </div>
              );
            })() : null}

            {isCreator ? (
              <div className="space-y-2">
                {project.lifecycle_status === "teaser" ? (
                  <>
                    <Link href={`/dashboard?project=${project.id}`} className="w-full">
                      <Button className="w-full">Convert Teaser</Button>
                    </Link>
                    <Link href={`/projects/new?edit=${project.id}`} className="w-full">
                      <Button variant="secondary" className="w-full">Edit Project</Button>
                    </Link>
                  </>
                ) : null}
                {(project.lifecycle_status === "premiering" || project.lifecycle_status === "released") && project.film_video_id && (
                  <Button className="w-full press-effect" onClick={handlePrimaryAction}>
                    {project.lifecycle_status === "premiering" ? "Watch Premiere" : "Watch Now"}
                  </Button>
                )}
                {project.lifecycle_status === "premiering" && !project.film_video_id && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-text-secondary">
                    <p className="font-medium text-amber-400">Premiere scheduled</p>
                    <p className="mt-1 text-xs text-text-tertiary">Deliver your film from the dashboard to launch the watch page.</p>
                    <Link href={`/dashboard?project=${project.id}`}>
                      <Button size="sm" className="mt-2 w-full">Go to Dashboard</Button>
                    </Link>
                  </div>
                )}
                <Link href={`/projects/new?edit=${project.id}`} className="w-full">
                  <Button variant="secondary" className="w-full">Edit Project</Button>
                </Link>
              </div>
            ) : project.lifecycle_status === "failed_to_unlock" ? (
              <div className="rounded-lg border border-role-danger-border bg-role-danger-bg p-3 text-sm text-role-danger-fg">
                This project didn&apos;t reach its goal. All backers were refunded.
              </div>
            ) : null}

            {/* Project Info */}
            {project.lifecycle_status !== "failed_to_unlock" && project.lifecycle_status !== "cancelled" && (
              <div className="space-y-1.5 rounded-lg border border-border bg-surface p-3 text-xs text-text-secondary">
                <p>
                  {creatorDeliverySummary}
                  {" · "}
                  {project.lifecycle_status === "teaser"
                    ? `${formatCount(project.like_count_cache ?? 0)} likes so far`
                    : `${project.preorder_count_cache.toLocaleString()} backer${project.preorder_count_cache !== 1 ? "s" : ""} so far`}
                </p>
                {project.lifecycle_status === "unlocking" && project.campaign_ends_at && (
                  <p className="text-text-tertiary">
                    Campaign ends: {new Date(project.campaign_ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {project.lifecycle_status !== "teaser" && project.production_window_days && (
                  <p className="text-text-tertiary">
                    Production window: {project.production_window_days} days
                  </p>
                )}
                {project.lifecycle_status !== "teaser" && project.estimated_delivery_at && (
                  <p className="text-text-tertiary">
                    Expected delivery: {new Date(project.estimated_delivery_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {project.lifecycle_status === "premiering" && (detail?.premiere?.premiere_scheduled_at || project.premiere_date) && (
                  <p className="text-text-tertiary">
                    Premiere: {new Date((detail?.premiere?.premiere_scheduled_at || project.premiere_date)!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {(project.lifecycle_status === "unlocking" || project.lifecycle_status === "in_production") && !isCreator ? (
                  <p className="text-text-tertiary">
                    {supportsUnlockGoal
                      ? "Full refund if this project doesn't reach its goal."
                      : "Preorders stay open until the creator sets a premiere."}
                  </p>
                ) : null}
              </div>
            )}

            {/* How It Works */}
            {(project.lifecycle_status === "unlocking" || project.lifecycle_status === "in_production") && !isCreator && supportsUnlockGoal && project.unlock_target && (
              <p className="text-xs leading-relaxed text-text-tertiary">
                <span className="font-medium text-text-secondary">How it works:</span>{" "}
                Preorder now. If {project.unlock_target.toLocaleString()} backers join, the film gets made. If not, you&apos;re refunded automatically.
              </p>
            )}

            <div className="space-y-2">
              {(project.lifecycle_status === "teaser" || project.lifecycle_status === "unlocking") ? (
                <ActionRailButton
                  label={interested ? "You want this" : "Want this made"}
                  description={`${formatCount(project.interest_count_cache ?? 0)} people want this`}
                  icon={<Sparkles size={14} className={interested ? "fill-current" : ""} />}
                  active={interested}
                  onClick={() => void handleInterest()}
                  className={getLifecycleHoverGlow(project.lifecycle_status)}
                />
              ) : null}
              <ActionRailButton
                label="Like Project"
                description={liked ? "Liked by supporters" : "Tap to support this project"}
                icon={<Heart size={14} className={liked ? "fill-current" : ""} />}
                active={liked}
                onClick={handleLike}
                className={getLifecycleHoverGlow(project.lifecycle_status)}
              />
              <ActionRailButton
                label="Open Discussion"
                description="Jump to comments"
                icon={<MessageCircle size={14} />}
                onClick={() => { setTab("discussion"); tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                className={getLifecycleHoverGlow(project.lifecycle_status)}
              />
              <ActionRailButton
                label="Share Project"
                description="Copy or share project link"
                icon={<Share2 size={14} />}
                onClick={() => void handleShare()}
                className={getLifecycleHoverGlow(project.lifecycle_status)}
              />
              <ActionRailButton
                label={saved ? "Saved" : "Save Project"}
                description={saved ? "Remove from saved list" : "Save for later"}
                icon={saved ? <BookmarkCheck size={14} className="fill-current" /> : <Bookmark size={14} />}
                active={saved}
                onClick={() => void handleSave()}
                className={getLifecycleHoverGlow(project.lifecycle_status)}
              />
            </div>

            {shareFeedback ? (
              <p className="text-center text-xs text-text-secondary animate-in fade-in">{shareFeedback}</p>
            ) : null}

            {project.lifecycle_status === "premiering" ? (
              <ActionRailButton
                tone="warning"
                label="Premiere Reminder"
                description="Get notified when this premiere starts"
                icon={<Bell size={14} />}
              />
            ) : null}

            {project.lifecycle_status === "unlocking" ? (
              <p className="text-xs text-text-tertiary">
                Cancel anytime during the campaign. After the campaign ends, preorders are locked in. If delivery is late, you can request a refund.
              </p>
            ) : null}
          </aside>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-page/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {project.lifecycle_status === "failed_to_unlock" && !isCreator ? (
          <p className="text-center text-sm text-role-danger-fg">
            This project didn&apos;t reach its goal. All backers were refunded.
          </p>
        ) : (
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {project.lifecycle_status === "teaser"
                  ? "Teaser live"
                  : isFreeWatch
                    ? "Free"
                  : (project.lifecycle_status === "premiering" || project.lifecycle_status === "released") && !hasAccess && project.release_price_cents
                    ? formatPrice(project.release_price_cents)
                  : project.preorder_price_cents ? formatPrice(project.preorder_price_cents) : "TBD"}
              </p>
              <p className={`truncate text-xs ${getLifecycleTextClassName(project.lifecycle_status)}`}>
                {project.lifecycle_status === "teaser"
                  ? `${formatCount(project.like_count_cache ?? 0)} likes · ${formatCount(project.discussion_count_cache ?? 0)} comments`
                  : project.lifecycle_status === "released"
                  ? (hasAccess ? "Watch now available" : isFreeWatch ? "Free to watch now" : "Buy access to watch")
                  : project.lifecycle_status === "premiering"
                    ? (hasAccess ? "Premiere access ready" : isFreeWatch ? "Premiere opens free" : "Buy access for premiere")
                    : project.lifecycle_status === "in_production"
                      ? "Film is being made"
                      : project.unlock_target ? `${project.preorder_count_cache}/${project.unlock_target}` : lifecycleLabel}
              </p>
            </div>
            {isCreator ? (
              <Link href={`/projects/new?edit=${project.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">Edit Project</Button>
              </Link>
            ) : (
              <Button className="flex-1" onClick={handlePrimaryAction} disabled={primaryActionDisabled}>
                {primaryLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {preorderOpen && project.lifecycle_status !== "teaser" ? (
        <PreorderBottomSheet
          open
          onClose={() => setPreorderOpen(false)}
          projectId={project.id}
          title={project.title}
          amountCents={bottomSheetMode === "purchase" ? project.release_price_cents : project.preorder_price_cents}
          mode={bottomSheetMode}
          lifecycleStatus={project.lifecycle_status}
          onSuccess={() => {
            setPreorderOpen(false);
            void refreshProject();
          }}
        />
      ) : null}

      {selectedCharCard ? (
        <CardDetailOverlay
          open
          onClose={() => setSelectedCharCard(null)}
          mediaUrl={getCardMediaUrl(selectedCharCard.media_asset_id, selectedCharCard.media_type)}
          mediaType={selectedCharCard.media_type as "image" | "video"}
          title={selectedCharCard.name}
          description={selectedCharCard.short_description}
        />
      ) : null}

      {selectedConceptCard ? (
        <CardDetailOverlay
          open
          onClose={() => setSelectedConceptCard(null)}
          mediaUrl={getCardMediaUrl(selectedConceptCard.media_asset_id, selectedConceptCard.media_type)}
          mediaType={selectedConceptCard.media_type as "image" | "video"}
          title={null}
          description={selectedConceptCard.caption}
        />
      ) : null}
    </>
  );
}
