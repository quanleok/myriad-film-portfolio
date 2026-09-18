"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Eye,
  ExternalLink,
  Globe,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { formatCount, timeAgo } from "@/lib/utils";
import { PillTabs } from "@/components/ui/pill-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectFeedItem } from "@/components/projects/types";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import {
  formatCreatorDeliverySummary,
  resolveCreatorTrust,
} from "@/lib/creator-trust";
import { ALL_VIDEO_GENRE_LABELS } from "@/types/video";

const TABS = [
  { value: "clips", label: "Clips" },
  { value: "projects", label: "Projects" },
  { value: "about", label: "About" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

interface CreatorPublicLink {
  kind: "website" | "twitter" | "youtube" | "tiktok" | "discord" | "other";
  label: string;
  href: string;
}

interface CreatorPortfolioClip {
  id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  genre: string;
  tags: string[] | null;
  project_id: string | null;
}

interface CreatorProjectsGridProps {
  projects: ProjectFeedItem[];
  clips: CreatorPortfolioClip[];
  clipCount: number;
  creatorBio: string | null;
  creatorDisplayName: string;
  creatorUsername: string;
  followerCount: number;
  totalViews: number;
  subscriberCount: number;
  deliveredCount: number;
  isFoundingMember: boolean;
  joinedAt: string;
  websiteUrl: string | null;
  publicLinks: CreatorPublicLink[];
  specialties: string[];
  hireSpecialties: string[];
  hireAvailabilityLabel: string | null;
  hirePriceBandLabel: string | null;
}

function DeliveryRecordSection({
  deliveredCount,
  isFoundingMember,
}: {
  deliveredCount: number;
  isFoundingMember: boolean;
}) {
  const trust = resolveCreatorTrust({
    isFoundingCreator: isFoundingMember,
    releasedProjectCount: deliveredCount,
  });

  return (
    <div className="rounded-2xl border border-border bg-page-secondary p-5">
      <h3 className="text-sm font-semibold text-text-primary">Delivery Record</h3>
      <CreatorTrustBadges trust={trust} className="mt-3" />
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        {trust.verifiedDelivery
          ? `${formatCreatorDeliverySummary(trust)} on Myriad Spring.`
          : "New creator. No released work on Myriad Spring yet."}
      </p>
    </div>
  );
}

function resolveClipLabel(clip: CreatorPortfolioClip) {
  const preferredTag = (clip.tags ?? []).find((tag) => {
    const key = tag.toLowerCase().trim();
    return [
      "meme",
      "parody",
      "short film",
      "short_film",
      "anime",
      "politics",
      "sports",
      "experimental",
      "music",
    ].includes(key);
  });

  if (preferredTag) {
    return preferredTag
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  return ALL_VIDEO_GENRE_LABELS[clip.genre] ?? clip.genre.replaceAll("_", " ");
}

function CreatorClipCard({ clip }: { clip: CreatorPortfolioClip }) {
  const publishedLabel = clip.published_at ?? clip.created_at;

  return (
    <Link
      href={`/watch/${clip.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-surface-hover"
    >
      <div className="relative aspect-video overflow-hidden bg-page">
        {clip.thumbnail_url ? (
          <Image
            src={clip.thumbnail_url}
            alt={clip.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_40%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full border border-border bg-page/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary backdrop-blur-md">
          {resolveClipLabel(clip)}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug text-text-primary transition-colors group-hover:text-brand-500">
            {clip.title}
          </h3>
          <p className="mt-1 text-xs text-text-tertiary">{timeAgo(publishedLabel)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Eye size={13} />
            {formatCount(clip.view_count ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart size={13} />
            {formatCount(clip.like_count ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={13} />
            {formatCount(clip.comment_count ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2 size={13} />
            {formatCount(clip.share_count ?? 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function PublicLinksSection({ publicLinks }: { publicLinks: CreatorPublicLink[] }) {
  if (publicLinks.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-page-secondary p-5">
        <h3 className="text-sm font-semibold text-text-primary">Public Links</h3>
        <p className="mt-3 text-sm text-text-tertiary">No public links yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-page-secondary p-5">
      <h3 className="text-sm font-semibold text-text-primary">Public Links</h3>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {publicLinks.map((link) => (
          <a
            key={`${link.kind}:${link.href}`}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            {link.kind === "website" ? <Globe size={14} /> : <ExternalLink size={14} />}
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function CreatorProjectsGrid({
  projects,
  clips,
  clipCount,
  creatorBio,
  creatorDisplayName,
  creatorUsername,
  followerCount,
  totalViews,
  subscriberCount,
  deliveredCount,
  isFoundingMember,
  joinedAt,
  websiteUrl,
  publicLinks,
  specialties,
  hireSpecialties,
  hireAvailabilityLabel,
  hirePriceBandLabel,
}: CreatorProjectsGridProps) {
  const defaultTab: TabValue =
    clips.length > 0 ? "clips" : projects.length > 0 ? "projects" : "about";
  const [tab, setTab] = useState<TabValue>(defaultTab);

  const joinedDate = new Date(joinedAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-8 space-y-6">
      <PillTabs tabs={[...TABS]} value={tab} onValueChange={(v) => setTab(v as TabValue)} />

      {tab === "clips" ? (
        clips.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black tracking-[-0.04em] text-text-primary">
                  Clips
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Latest public work, experiments, and high-signal drops.
                </p>
              </div>
              <span className="text-sm text-text-tertiary">
                {clipCount} clip{clipCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {clips.map((clip) => (
                <CreatorClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            icon="🎬"
            title="No public clips yet"
            description={`${creatorDisplayName} has not published any clips yet.`}
          />
        )
      ) : null}

      {tab === "projects" ? (
        projects.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-black tracking-[-0.04em] text-text-primary">
                  Projects
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Serious launches, teaser pages, and full production work.
                </p>
              </div>
              <span className="text-sm text-text-tertiary">
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} showStatus />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            icon="🎞️"
            title="No public projects yet"
            description={`${creatorDisplayName} has not launched any film projects yet.`}
          />
        )
      ) : null}

      {tab === "about" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-page-secondary p-5">
              <h3 className="text-sm font-semibold text-text-primary">Bio</h3>
              <div className="mt-3">
                {creatorBio ? (
                  <p className="text-sm leading-7 text-text-secondary">{creatorBio}</p>
                ) : (
                  <p className="text-sm italic text-text-tertiary">No bio yet.</p>
                )}
              </div>
            </div>

            {specialties.length > 0 ? (
              <div className="rounded-2xl border border-border bg-page-secondary p-5">
                <h3 className="text-sm font-semibold text-text-primary">Specialties</h3>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {hireSpecialties.length > 0 ||
            hireAvailabilityLabel ||
            hirePriceBandLabel ? (
              <div className="rounded-2xl border border-border bg-page-secondary p-5">
                <h3 className="text-sm font-semibold text-text-primary">Hiring</h3>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {hireSpecialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-400"
                    >
                      {specialty}
                    </span>
                  ))}
                  {hireAvailabilityLabel ? (
                    <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                      {hireAvailabilityLabel}
                    </span>
                  ) : null}
                  {hirePriceBandLabel ? (
                    <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                      {hirePriceBandLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <PublicLinksSection publicLinks={publicLinks} />
          </div>

          <div className="space-y-4">
            <DeliveryRecordSection deliveredCount={deliveredCount} isFoundingMember={isFoundingMember} />

            <div className="rounded-2xl border border-border bg-page-secondary p-5">
              <h3 className="text-sm font-semibold text-text-primary">Details</h3>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Joined</dt>
                  <dd className="text-right text-text-secondary">{joinedDate}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Username</dt>
                  <dd className="text-right text-text-secondary">@{creatorUsername}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Website</dt>
                  <dd className="text-right text-text-secondary">
                    {websiteUrl ? "Listed" : "Not listed"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Availability</dt>
                  <dd className="text-right text-text-secondary">
                    {hireAvailabilityLabel ?? "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Price band</dt>
                  <dd className="text-right text-text-secondary">
                    {hirePriceBandLabel ?? "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Followers</dt>
                  <dd className="text-right text-text-secondary">{formatCount(followerCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Views</dt>
                  <dd className="text-right text-text-secondary">{formatCount(totalViews)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Subscribers</dt>
                  <dd className="text-right text-text-secondary">{formatCount(subscriberCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Clips</dt>
                  <dd className="text-right text-text-secondary">{clipCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Projects</dt>
                  <dd className="text-right text-text-secondary">{projects.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-tertiary">Released</dt>
                  <dd className="text-right text-text-secondary">{deliveredCount}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
