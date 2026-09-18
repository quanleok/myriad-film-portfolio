import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCount } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";
import { Avatar } from "@/components/ui/avatar";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import {
  formatCreatorDeliverySummary,
  resolveCreatorTrust,
} from "@/lib/creator-trust";

import {
  ALL_VIDEO_GENRE_LABELS,
  hasVideoStoryElements,
  normalizeVideoStoryElements,
} from "@/types/video";
import { FollowButton } from "@/components/creator/follow-button";
import { ExpandableDescription } from "@/components/video/ExpandableDescription";
import { LiveChatSidebar } from "@/components/video/LiveChatSidebar";
import { TheaterRow } from "@/components/video/TheaterRow";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ViewTracker } from "@/components/video/ViewTracker";
import { MiniPlayerActivator } from "@/components/video/MiniPlayerActivator";
import { VideoStoryPackage } from "@/components/video/video-story-package";
import { WatchPlayerSection } from "./watch-player-section";
import { SuccessToast } from "./success-toast";
import { ClipDiscussionPanel } from "./clip-discussion-panel";
import Link from "next/link";
export const revalidate = 60;

interface CreatorSummary {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_founding_creator: boolean | null;
  released_project_count: number;
  follower_count: number;
}

interface RelatedClip {
  id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
  like_count: number | null;
  profiles: {
    display_name: string | null;
    username: string | null;
  } | null;
}

type RelatedClipRow = Omit<RelatedClip, "profiles"> & {
  profiles:
    | {
        display_name: string | null;
        username: string | null;
      }
    | Array<{
        display_name: string | null;
        username: string | null;
      }>
    | null;
};

interface WatchPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ purchased?: string }>;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}

function normalizeRelatedClip(clip: RelatedClipRow): RelatedClip {
  const profile = Array.isArray(clip.profiles)
    ? clip.profiles[0] ?? null
    : clip.profiles;

  return {
    ...clip,
    profiles: profile,
  };
}

export async function generateMetadata({
  params,
}: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { data } = await supabase
    .from("videos")
    .select(
      `
      id,
      title,
      description,
      thumbnail_url,
      pricing_model,
      genre,
      ai_tool,
      profiles!videos_creator_id_fkey (
        display_name,
        username
      )
    `
    )
    .eq("id", id)
    .single();

  const video = data as {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    pricing_model: string;
    genre: string | null;
    ai_tool: string | null;
    profiles: { display_name: string; username: string } | null;
  } | null;

  if (!video) {
    return {
      title: "Video Not Found — Myriad Spring",
      robots: { index: false, follow: false },
    };
  }

  const creatorName = video.profiles?.display_name ?? "Unknown Creator";
  const title = `${video.title} — ${creatorName}`;
  const description = video.description
    ? video.description
    : `Watch ${video.title} on Myriad Spring by ${creatorName}.`;
  const url = `${siteUrl}/watch/${video.id}`;

  const genreLabel = video.genre
    ? ALL_VIDEO_GENRE_LABELS[video.genre as keyof typeof ALL_VIDEO_GENRE_LABELS]
    : null;
  const keywords = [
    "AI film",
    ...(genreLabel ? [`AI ${genreLabel.toLowerCase()}`] : []),
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Myriad Spring",
      type: "video.other",
      images: video.thumbnail_url
        ? [{ url: video.thumbnail_url, alt: video.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: video.thumbnail_url ? [video.thumbnail_url] : undefined,
    },
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { id } = await params;
  const { purchased } = await searchParams;
  const supabase = await createClient();
  const siteUrl = getSiteUrl();
  const justPurchased = purchased === "1";

  const { data: videoData } = await supabase
    .from("videos")
    .select(
      `
      *,
      profiles!videos_creator_id_fkey (
        id,
        display_name,
        username,
        avatar_url,
        is_founding_creator,
        follower_count
      )
    `
    )
    .eq("id", id)
    .single();

  if (!videoData) notFound();

  const isDeletedVideo = !!(videoData as any).deleted_at;
  let isDeletedWithAccess = false;

  // Access control for soft-deleted videos: only existing purchasers can view
  if (isDeletedVideo) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) notFound();
    const isCreator = currentUser.id === videoData.creator_id;
    if (!isCreator) {
      const { data: purchaseRecord } = await supabase
        .from("purchases")
        .select("id")
        .eq("viewer_id", currentUser.id)
        .eq("video_id", id)
        .eq("payment_status", "completed")
        .maybeSingle();
      if (!purchaseRecord) notFound();
      isDeletedWithAccess = true;
    }
  }

  // Access control for unpublished videos
  if (!isDeletedVideo && !videoData.is_published) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isCreator = currentUser?.id === videoData.creator_id;
    if (!isCreator) {
      const isFreeVideo = videoData.pricing_model === "free";
      if (isFreeVideo) notFound();
      if (!currentUser) notFound();
      const { data: accessResult } = await supabase.rpc("viewer_has_access", {
        p_viewer_id: currentUser.id,
        p_video_id: id,
      });
      if (!accessResult) notFound();
    }
  }

  // Visibility access control
  const videoVisibility = (videoData as any).visibility ?? "public";
  if (!isDeletedVideo && videoData.is_published && videoVisibility === "private") {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isCreator = currentUser?.id === videoData.creator_id;
    if (!isCreator) {
      let hasAccess = false;
      if (currentUser) {
        const { data: accessResult } = await supabase.rpc("viewer_has_access", {
          p_viewer_id: currentUser.id,
          p_video_id: id,
        });
        hasAccess = accessResult === true;
      }
      if (!hasAccess) notFound();
    }
  }

  const video = videoData;
  const storyElements = normalizeVideoStoryElements(
    (videoData as { story_elements?: unknown }).story_elements
  );
  const hasStoryElements = hasVideoStoryElements(storyElements);
  const creatorProfile = video.profiles as Omit<CreatorSummary, "released_project_count"> | null;
  let releasedProjectCount = 0;
  if (creatorProfile?.id) {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creatorProfile.id)
      .eq("lifecycle_status", "released")
      .eq("moderation_status", "live");
    releasedProjectCount = count ?? 0;
  }
  const creator: CreatorSummary | null = creatorProfile
    ? { ...creatorProfile, released_project_count: releasedProjectCount }
    : null;
  const creatorTrust = resolveCreatorTrust({
    isFoundingCreator: creator?.is_founding_creator,
    releasedProjectCount: creator?.released_project_count,
  });
  const creatorDeliverySummary = formatCreatorDeliverySummary(creatorTrust);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let sourceProject:
    | {
        id: string;
        slug: string | null;
        title: string;
        lifecycle_status: string;
        format: string | null;
        episode_count: number | null;
      }
    | null = null;

  const linkedProjectId = (video as { project_id?: string | null }).project_id ?? null;
  if (linkedProjectId) {
    const { data: linkedProject } = await supabase
      .from("projects")
      .select("id, slug, title, lifecycle_status, format, episode_count, moderation_status, creator_id")
      .eq("id", linkedProjectId)
      .maybeSingle();

    if (
      linkedProject &&
      (linkedProject.moderation_status === "live" || linkedProject.creator_id === user?.id)
    ) {
      sourceProject = linkedProject;
    }
  }

  if (!sourceProject) {
    const { data: filmProject } = await supabase
      .from("projects")
      .select("id, slug, title, lifecycle_status, format, episode_count, moderation_status, creator_id")
      .eq("film_video_id", id)
      .maybeSingle();
    if (
      filmProject &&
      (filmProject.moderation_status === "live" || filmProject.creator_id === user?.id)
    ) {
      sourceProject = filmProject;
    }
  }

  // If this video is part of a series, also try finding it via project_episodes
  let seriesProject = sourceProject;
  if (!seriesProject) {
    const { data: epRow } = await supabase
      .from("project_episodes")
      .select("project_id")
      .eq("video_id", id)
      .maybeSingle();
    if (epRow) {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, slug, title, lifecycle_status, format, episode_count")
        .eq("id", epRow.project_id)
        .maybeSingle();
      seriesProject = proj;
    }
  }

  // Fetch sibling episodes for series
  let seriesEpisodes: Array<{
    id: string;
    episode_number: number;
    title: string;
    video_id: string | null;
    premiere_scheduled_at: string | null;
    premiere_ended: boolean;
    is_premiere_live: boolean;
  }> | null = null;

  if (seriesProject && (seriesProject as Record<string, unknown>).format === "series") {
    const { data: epData } = await supabase
      .from("project_episodes")
      .select("id, episode_number, title, video_id, premiere_scheduled_at, premiere_ended, is_premiere_live")
      .eq("project_id", seriesProject.id)
      .order("episode_number", { ascending: true });
    seriesEpisodes = epData;
  }

  const relatedVideoSelect = `
    id,
    title,
    thumbnail_url,
    published_at,
    created_at,
    like_count,
    profiles!videos_creator_id_fkey (
      display_name,
      username
    )
  `;

  const creatorClipsPromise = supabase
    .from("videos")
    .select(relatedVideoSelect)
    .eq("creator_id", video.creator_id)
    .eq("is_published", true)
    .is("deleted_at", null)
    .neq("id", id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(6);

  const similarClipsPromise = video.genre
    ? supabase
        .from("videos")
        .select(relatedVideoSelect)
        .eq("genre", video.genre)
        .eq("is_published", true)
        .is("deleted_at", null)
        .neq("id", id)
        .neq("creator_id", video.creator_id)
        .order("like_count", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(6)
    : Promise.resolve({ data: [], error: null });

  // Whether this video is actively premiering
  const isActivePremiere = video.is_premiere && !video.premiere_ended;

  let userLiked = false;
  let savedPosition = 0;

  if (user) {
    const [likeRes, historyRes] = await Promise.all([
      supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", id)
        .maybeSingle(),
      supabase
        .from("watch_history")
        .select("last_position_seconds")
        .eq("user_id", user.id)
        .eq("video_id", id)
        .maybeSingle(),
      ]);

    userLiked = Boolean(likeRes.data);
    savedPosition = (historyRes.data as any)?.last_position_seconds ?? 0;
  }

  const [creatorClipsRes, similarClipsRes] = await Promise.all([
    creatorClipsPromise,
    similarClipsPromise,
  ]);

  const creatorClips = ((creatorClipsRes.data ?? []) as RelatedClipRow[])
    .map(normalizeRelatedClip)
    .slice(0, 6);
  const similarClips = ((similarClipsRes.data ?? []) as RelatedClipRow[])
    .map(normalizeRelatedClip)
    .slice(0, 6);
  const hasSidebarContent =
    Boolean(sourceProject) ||
    Boolean(seriesEpisodes?.length) ||
    creatorClips.length > 0 ||
    similarClips.length > 0;

  const isPremium = video.pricing_model !== "free";
  const creatorHref = creator?.username ? `/creator/${creator.username}` : null;

  // Generate stream URL server-side
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;
  const streamUrl =
    !isPremium && video.bunny_video_id && cdnHostname
      ? `https://${cdnHostname}/${video.bunny_video_id}/playlist.m3u8`
      : null;

  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description ?? "AI video on Myriad Spring.",
    thumbnailUrl: video.thumbnail_url ? [video.thumbnail_url] : undefined,
    uploadDate: video.published_at ?? video.created_at,
    genre: ALL_VIDEO_GENRE_LABELS[video.genre as keyof typeof ALL_VIDEO_GENRE_LABELS],
    contentUrl: `${siteUrl}/watch/${video.id}`,
    creator: {
      "@type": "Person",
      name: creator?.display_name ?? "Unknown Creator",
      url: creator?.username
        ? `${siteUrl}/creator/${creator.username}`
        : undefined,
    },
  };

  return (
    <>
      <ViewTracker videoId={id} />
      <MiniPlayerActivator
        videoId={id}
        title={video.title}
        creatorName={creator?.display_name ?? "Unknown"}
        thumbnailUrl={video.thumbnail_url}
        streamUrl={streamUrl}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
      />

      {isDeletedWithAccess && (
        <div className="mx-auto max-w-7xl px-4 mt-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            This content has been removed by the creator. You can still watch it because you purchased it.
          </div>
        </div>
      )}

      {/* Theater row — video + chat side by side */}
      <TheaterRow
        videoId={id}
        creatorId={video.creator_id}
        isPremiere={isActivePremiere}
        premiereAt={video.premiere_at}
        premiereEnded={video.premiere_ended}
        title={video.title}
        thumbnailUrl={video.thumbnail_url}
        creatorName={creator?.display_name}
        creatorAvatar={creator?.avatar_url}
      >
        <WatchPlayerSection
          videoId={id}
          streamUrl={streamUrl}
          thumbnailUrl={video.thumbnail_url}
          previewSeconds={video.preview_seconds ?? 10}
          pricingModel={video.pricing_model}
          priceCents={video.price_cents ?? 0}
          creatorId={video.creator_id}
          subscriptionPriceCents={0}
          creatorName={creator?.display_name}
          creatorUsername={creator?.username}
          durationSeconds={video.duration_seconds ?? undefined}
          initialPosition={savedPosition}
          nextEpisode={null}
          seriesTitle=""
          isSubscribed={false}
        />
      </TheaterRow>

      {/* Mobile chat — only during active premiere */}
      {isActivePremiere && (
        <div className="mt-4 px-4 lg:hidden">
          <ErrorBoundary>
            <LiveChatSidebar
              videoId={id}
              creatorId={video.creator_id}
              forceOpen
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Purchase success banner */}
      {justPurchased && (
        <SuccessToast message="Purchase complete! You now have full access." />
      )}

      <div className="mx-auto mt-4 max-w-7xl space-y-6 px-4 sm:px-6">
        <section className="rounded-[28px] border border-white/8 bg-[#050807] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-black leading-[0.98] tracking-[-0.05em] text-text-primary sm:text-[2.3rem]">
              {video.title}
            </h1>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {creatorHref ? (
                  <Link href={creatorHref} className="shrink-0">
                    <Avatar
                      src={creator?.avatar_url}
                      fallback={creator?.display_name ?? "C"}
                      size="lg"
                      className="rounded-2xl border border-white/10 bg-[#0d1510] ring-0 shadow-[0_12px_30px_rgba(0,0,0,0.24)]"
                    />
                  </Link>
                ) : (
                  <div className="shrink-0">
                    <Avatar
                      src={creator?.avatar_url}
                      fallback={creator?.display_name ?? "C"}
                      size="lg"
                      className="rounded-2xl border border-white/10 bg-[#0d1510] ring-0 shadow-[0_12px_30px_rgba(0,0,0,0.24)]"
                    />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {creatorHref ? (
                      <Link
                        href={creatorHref}
                        className="truncate text-[15px] font-semibold text-text-primary transition-colors hover:text-white"
                      >
                        {creator?.display_name ?? "Unknown Creator"}
                      </Link>
                    ) : (
                      <span className="truncate text-[15px] font-semibold text-text-primary">
                        {creator?.display_name ?? "Unknown Creator"}
                      </span>
                    )}
                    <CreatorTrustBadges trust={creatorTrust} />
                  </div>
                  <p className="mt-1 text-[13px] leading-tight text-text-secondary">
                    {creatorDeliverySummary} ·{" "}
                    {formatCount(creator?.follower_count ?? 0)} followers
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <FollowButton creatorId={video.creator_id} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
              <span>
                {video.published_at
                  ? timeAgo(video.published_at)
                  : timeAgo(video.created_at)}
              </span>
              <span className="text-text-tertiary">&middot;</span>
              <span>{formatCount(video.view_count ?? 0)} views</span>
              {sourceProject ? (
                <>
                  <span className="text-text-tertiary">&middot;</span>
                  <Link
                    href={`/project/${sourceProject.slug ?? sourceProject.id}`}
                    className="font-medium text-brand-400 transition-colors hover:text-brand-300"
                  >
                    {sourceProject.title}
                  </Link>
                </>
              ) : null}
              {hasStoryElements ? (
                <>
                  <span className="text-text-tertiary">&middot;</span>
                  <span>
                    {storyElements.characters.length +
                      storyElements.locations.length +
                      storyElements.props.length}{" "}
                    references
                  </span>
                </>
              ) : null}
            </div>

            {video.description ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <ExpandableDescription text={video.description} />
              </div>
            ) : null}
          </div>
        </section>

        {hasStoryElements ? <VideoStoryPackage storyElements={storyElements} /> : null}

        <div
          className={
            hasSidebarContent
              ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
              : "block"
          }
        >
          <div className="min-w-0">
            <ClipDiscussionPanel
              videoId={id}
              title={video.title}
              initialUpvotes={Number(video.like_count ?? 0)}
              initialComments={Number(video.comment_count ?? 0)}
              initialShares={Number(video.share_count ?? 0)}
              initiallyUpvoted={userLiked}
            />
          </div>

          {hasSidebarContent ? (
            <aside className="min-w-0">
              <div className="space-y-4 xl:sticky xl:top-20">
                {sourceProject ? (
                  <section className="rounded-[24px] border border-white/8 bg-[#050807] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-400">
                      Film project
                    </p>
                    <h2 className="mt-2 font-display text-lg font-semibold text-text-primary">
                      {sourceProject.title}
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                      Open the project page for the full story context, creator updates, and release path behind this clip.
                    </p>
                    <Link
                      href={`/project/${sourceProject.slug ?? sourceProject.id}`}
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/82 transition-colors hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                    >
                      Open project
                    </Link>
                  </section>
                ) : null}

                {seriesEpisodes && seriesEpisodes.length > 0 ? (
                  <section className="rounded-[24px] border border-white/8 bg-[#050807] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-text-primary">
                          Episodes
                        </h2>
                        {seriesProject ? (
                          <p className="text-xs text-text-tertiary">
                            {(seriesProject as Record<string, unknown>).title as string}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs text-text-tertiary">
                        {seriesEpisodes.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {seriesEpisodes.map((episode) => {
                        const isCurrent = episode.video_id === id;
                        const hasPremiered =
                          episode.premiere_ended ||
                          (episode.premiere_scheduled_at &&
                            new Date(episode.premiere_scheduled_at) <= new Date());
                        const isLocked = !hasPremiered;

                        const content = (
                          <>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-text-primary">
                              {episode.episode_number}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-text-primary">
                                {episode.title || `Episode ${episode.episode_number}`}
                              </p>
                              <p className="mt-0.5 text-xs text-text-tertiary">
                                {isCurrent
                                  ? "Now playing"
                                  : isLocked
                                    ? "Locked"
                                    : "Watch episode"}
                              </p>
                            </div>
                          </>
                        );

                        return isLocked ? (
                          <div
                            key={episode.id}
                            className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-2 opacity-55"
                          >
                            {content}
                          </div>
                        ) : (
                          <Link
                            key={episode.id}
                            href={`/watch/${episode.video_id}`}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 transition-colors ${
                              isCurrent
                                ? "border-brand/30 bg-brand/10"
                                : "border-white/6 bg-white/[0.02] hover:bg-white/[0.05]"
                            }`}
                          >
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {creatorClips.length > 0 ? (
                  <section className="rounded-[24px] border border-white/8 bg-[#050807] p-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                      More from {creator?.display_name ?? "this creator"}
                    </h2>
                    <div className="mt-3 space-y-3">
                      {creatorClips.map((clip) => (
                        <Link
                          key={clip.id}
                          href={`/watch/${clip.id}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-2 transition-colors hover:bg-white/[0.05]"
                        >
                          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-black">
                            {clip.thumbnail_url ? (
                              <img
                                src={clip.thumbnail_url}
                                alt={clip.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-white/40">
                                Clip
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
                              {clip.title}
                            </p>
                            <p className="mt-1 text-xs text-text-tertiary">
                              {clip.published_at
                                ? timeAgo(clip.published_at)
                                : timeAgo(clip.created_at)}{" "}
                              · {formatCount(clip.like_count ?? 0)} upvotes
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}

                {similarClips.length > 0 ? (
                  <section className="rounded-[24px] border border-white/8 bg-[#050807] p-4">
                    <h2 className="font-display text-lg font-semibold text-text-primary">
                      Similar clips
                    </h2>
                    <div className="mt-3 space-y-3">
                      {similarClips.map((clip) => (
                        <Link
                          key={clip.id}
                          href={`/watch/${clip.id}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] p-2 transition-colors hover:bg-white/[0.05]"
                        >
                          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-black">
                            {clip.thumbnail_url ? (
                              <img
                                src={clip.thumbnail_url}
                                alt={clip.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-white/40">
                                Clip
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
                              {clip.title}
                            </p>
                            <p className="mt-1 text-xs text-text-tertiary">
                              {(clip.profiles?.display_name ?? "Unknown Creator")} ·{" "}
                              {formatCount(clip.like_count ?? 0)} upvotes
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}
