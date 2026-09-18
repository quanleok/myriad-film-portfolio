import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCount } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "@/components/creator/follow-button";
import { BlockCreatorButton } from "@/components/creator/block-creator-button";
import { CreatorProjectsGrid } from "@/components/creator/creator-projects-grid";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import {
  formatCreatorDeliverySummary,
  resolveCreatorTrust,
} from "@/lib/creator-trust";
import {
  buildPublicLinks,
  buildSpecialties,
  deriveHireSpecialties,
  HIRE_AVAILABILITY_LABELS,
  HIRE_PRICE_BAND_LABELS,
  isHireAvailability,
  isHirePriceBand,
  type TalentClipSample as CreatorPortfolioClip,
} from "@/lib/talent";

export const revalidate = 120;

interface CreatorPageProps {
  params: Promise<{ slug: string }>;
}

const LIFECYCLE_ORDER: Record<string, number> = {
  teaser: 0,
  unlocking: 1,
  in_production: 2,
  premiering: 3,
  released: 4,
  draft: 5,
  failed_to_unlock: 6,
  cancelled: 7,
};

export async function generateMetadata({
  params,
}: CreatorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { data } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url, bio, website_url, social_links, is_creator")
    .eq("username", slug)
    .eq("is_creator", true)
    .single();

  if (!data) {
    return {
      title: "Creator Not Found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${data.display_name} (@${data.username})`;
  const description =
    data.bio ??
    `Browse clips and projects by ${data.display_name} on Myriad Spring.`;
  const url = `${siteUrl}/creator/${data.username}`;
  const publicLinks = buildPublicLinks(data.website_url, data.social_links);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      images: data.avatar_url
        ? [{ url: data.avatar_url, alt: data.display_name }]
        : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: data.avatar_url ? [data.avatar_url] : undefined,
    },
    other: publicLinks.length
      ? {
          "profile:same_as": publicLinks.map((link) => link.href).join(","),
        }
      : undefined,
  };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { data: creatorData } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, avatar_url, banner_url, bio, website_url, social_links, is_creator, is_founding_creator, follower_count, hire_specialties, hire_availability, hire_price_band, subscriber_count, total_views, creator_good_standing, created_at"
    )
    .eq("username", slug)
    .eq("is_creator", true)
    .single();

  if (!creatorData) notFound();

  const creator = creatorData;

  const [projectsRes, clipsRes, clipCountRes, authRes] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `id, slug, title, hook, genre, format, tone, runtime_minutes,
         teaser_asset_id, teaser_thumbnail_url, preorder_price_cents, release_price_cents,
         unlock_target, preorder_count_cache, like_count_cache,
         discussion_count_cache, lifecycle_status, launch_mode, moderation_status, content_rating, created_at`
      )
      .eq("creator_id", creator.id)
      .eq("moderation_status", "live")
      .order("created_at", { ascending: false }),
    supabase
      .from("videos")
      .select(
        "id, title, thumbnail_url, published_at, created_at, view_count, like_count, comment_count, share_count, genre, tags, project_id"
      )
      .eq("creator_id", creator.id)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", creator.id)
      .eq("is_published", true)
      .is("deleted_at", null),
    supabase.auth.getUser(),
  ]);

  const {
    data: { user },
  } = authRes;

  const projects = (projectsRes.data ?? [])
    .map((project) => ({
      ...project,
      profiles: {
        display_name: creator.display_name,
        username: creator.username,
        avatar_url: creator.avatar_url,
      },
      synopsis: null,
      inspiration_line: null,
      creator: null,
      character_cards: null,
      concept_cards: null,
      premiere_date: null,
      campaign_ends_at: null,
      delivery_deadline: null,
      production_window_days: null,
      is_overdue: false,
      interest_count_cache: 0,
      purchase_count_cache: 0,
      update_count_cache: 0,
      save_count_cache: 0,
      preorders_today: 0,
      production_progress: 0,
      episode_count:
        (project as Record<string, unknown>).episode_count as number | null ??
        null,
      is_test: Boolean((project as Record<string, unknown>).is_test),
      launch_mode:
        ((project as Record<string, unknown>).launch_mode as string) ??
        "preorder",
    }))
    .sort((a, b) => {
      const aOrder = LIFECYCLE_ORDER[a.lifecycle_status] ?? 99;
      const bOrder = LIFECYCLE_ORDER[b.lifecycle_status] ?? 99;
      return aOrder - bOrder;
    });

  const clips = (clipsRes.data ?? []) as CreatorPortfolioClip[];
  const clipCount = clipCountRes.count ?? clips.length;

  const deliveredCount = projects.filter(
    (project) => project.lifecycle_status === "released"
  ).length;
  const trust = resolveCreatorTrust({
    isFoundingCreator: creator.is_founding_creator,
    releasedProjectCount: deliveredCount,
  });
  const publicLinks = buildPublicLinks(creator.website_url, creator.social_links);
  const specialties = buildSpecialties(projects, clips);
  const hireSpecialties: string[] =
    creator.hire_specialties && creator.hire_specialties.length > 0
      ? creator.hire_specialties.filter(
          (specialty: string | null | undefined): specialty is string =>
            Boolean(specialty)
        )
      : deriveHireSpecialties(specialties, clipCount, projects.length);
  const hireAvailability = isHireAvailability(creator.hire_availability)
    ? creator.hire_availability
    : null;
  const hirePriceBand = isHirePriceBand(creator.hire_price_band)
    ? creator.hire_price_band
    : null;
  const hireAvailabilityLabel = hireAvailability
    ? HIRE_AVAILABILITY_LABELS[hireAvailability]
    : null;
  const hirePriceBandLabel = hirePriceBand
    ? HIRE_PRICE_BAND_LABELS[hirePriceBand]
    : null;
  const heroSummary =
    specialties.length > 0
      ? specialties.join(" · ")
      : `${clipCount} clip${clipCount === 1 ? "" : "s"} and ${projects.length} project${projects.length === 1 ? "" : "s"}`;

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: creator.display_name,
    alternateName: `@${creator.username}`,
    description: creator.bio ?? undefined,
    image: creator.avatar_url ?? undefined,
    url: `${siteUrl}/creator/${creator.username}`,
    sameAs: publicLinks.map((link) => link.href),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <div className="brand-halo-bg mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-page/95 p-6 shadow-sm backdrop-blur-xl sm:p-8">
          <div className="absolute inset-0">
            {creator.banner_url ? (
              <Image
                src={creator.banner_url}
                alt=""
                fill
                className="object-cover opacity-20"
                sizes="(min-width: 1024px) 1200px, 100vw"
              />
            ) : null}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_38%)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-page/96 via-page/94 to-page-secondary/88" />
          </div>

          <div className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              <Avatar
                src={creator.avatar_url}
                fallback={creator.display_name}
                size="xl"
                className="!h-28 !w-28 shrink-0 rounded-[26px] border border-border bg-surface text-4xl ring-0 shadow-sm sm:!h-32 sm:!w-32 sm:text-5xl"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-3xl font-black tracking-[-0.05em] text-text-primary sm:text-4xl">
                    {creator.display_name}
                  </h1>
                  <CreatorTrustBadges trust={trust} size="md" />
                </div>

                <p className="mt-2 text-sm text-text-tertiary">@{creator.username}</p>

                <p className="mt-3 text-sm font-medium text-text-secondary">
                  {heroSummary}
                </p>

                {creator.bio ? (
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
                    {creator.bio}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-text-secondary">
                  <span>{formatCreatorDeliverySummary(trust)}</span>
                  <span className="text-text-tertiary">&middot;</span>
                  <span>
                    {projects.length} project{projects.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-text-tertiary">&middot;</span>
                  <span>
                    {clipCount} clip{clipCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-text-tertiary">&middot;</span>
                  <span>
                    {formatCount(creator.follower_count ?? 0)} follower
                    {(creator.follower_count ?? 0) !== 1 ? "s" : ""}
                  </span>
                  <span className="text-text-tertiary">&middot;</span>
                  <span>{formatCount(creator.total_views ?? 0)} views</span>
                  <span className="text-text-tertiary">&middot;</span>
                  <span>{deliveredCount} delivered</span>
                </div>

                {specialties.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                ) : null}

                {hireSpecialties.length > 0 ||
                hireAvailabilityLabel ||
                hirePriceBandLabel ? (
                  <div className="mt-3 flex flex-wrap gap-2">
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
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                {publicLinks.length > 0 ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {publicLinks.slice(0, 4).map((link) => (
                      <a
                        key={`${link.kind}:${link.href}`}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                      >
                        {link.kind === "website" ? <Globe size={14} /> : <ExternalLink size={14} />}
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}

                {(!user || user.id !== creator.id) && (
                  <div className="flex items-center gap-2">
                    <FollowButton creatorId={creator.id} />
                    <BlockCreatorButton
                      creatorId={creator.id}
                      creatorUsername={creator.username}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <CreatorProjectsGrid
            projects={
              projects as Parameters<typeof CreatorProjectsGrid>[0]["projects"]
            }
            clips={clips}
            clipCount={clipCount}
            creatorBio={creator.bio}
            creatorDisplayName={creator.display_name}
            creatorUsername={creator.username}
            followerCount={creator.follower_count ?? 0}
            totalViews={creator.total_views ?? 0}
            subscriberCount={creator.subscriber_count ?? 0}
            deliveredCount={deliveredCount}
            isFoundingMember={trust.foundingMember}
            joinedAt={creator.created_at}
            websiteUrl={creator.website_url}
            publicLinks={publicLinks}
            specialties={specialties}
            hireSpecialties={hireSpecialties}
            hireAvailabilityLabel={hireAvailabilityLabel}
            hirePriceBandLabel={hirePriceBandLabel}
          />
          </div>
        </div>
    </>
  );
}
