import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tables } from "@/types/database";
import type { ProjectLaunchMode, ProjectLifecycleStatus } from "@/types/project";
import { ALL_VIDEO_GENRE_LABELS } from "@/types/video";
import { PROJECT_FORMAT_LABELS, PROJECT_GENRE_LABELS } from "@/types/project";

export type CreatorPublicLink = {
  kind: "website" | "twitter" | "youtube" | "tiktok" | "discord" | "other";
  label: string;
  href: string;
};

export const HIRE_SPECIALTY_OPTIONS = [
  "Ads",
  "Film",
  "Music Video",
  "Sound Effect",
  "Other",
] as const;

export const HIRE_AVAILABILITY_OPTIONS = [
  "open",
  "limited",
  "booked",
] as const;

export const HIRE_PRICE_BAND_OPTIONS = [
  "budget",
  "standard",
  "premium",
] as const;

export type HireSpecialty = (typeof HIRE_SPECIALTY_OPTIONS)[number];
export type HireAvailability = (typeof HIRE_AVAILABILITY_OPTIONS)[number];
export type HirePriceBand = (typeof HIRE_PRICE_BAND_OPTIONS)[number];

export const HIRE_AVAILABILITY_LABELS: Record<HireAvailability, string> = {
  open: "Open",
  limited: "Limited",
  booked: "Booked",
};

export const HIRE_PRICE_BAND_LABELS: Record<HirePriceBand, string> = {
  budget: "Budget",
  standard: "Standard",
  premium: "Premium",
};

export type TalentClipSample = Pick<
  Tables<"videos">,
  | "id"
  | "creator_id"
  | "title"
  | "thumbnail_url"
  | "published_at"
  | "created_at"
  | "view_count"
  | "like_count"
  | "comment_count"
  | "share_count"
  | "genre"
  | "tags"
  | "project_id"
>;

export interface TalentProjectSample {
  id: string;
  creator_id: string | null;
  slug: string | null;
  title: string;
  hook: string | null;
  genre: string | null;
  format: string | null;
  lifecycle_status: ProjectLifecycleStatus;
  launch_mode: ProjectLaunchMode;
  teaser_thumbnail_url: string | null;
  preorder_count_cache: number | null;
  purchase_count_cache: number | null;
  created_at: string;
}

type TalentProfileRow = Pick<
  Tables<"profiles">,
  | "id"
  | "display_name"
  | "username"
  | "avatar_url"
  | "bio"
  | "website_url"
  | "social_links"
  | "is_founding_creator"
  | "follower_count"
  | "hire_specialties"
  | "hire_availability"
  | "hire_price_band"
  | "subscriber_count"
  | "total_views"
  | "created_at"
>;

export interface TalentSummary {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  headline: string;
  kindLabel: "Creator" | "Studio";
  followerCount: number;
  subscriberCount: number;
  totalViews: number;
  clipCount: number;
  projectCount: number;
  deliveredCount: number;
  heroImageUrl: string | null;
  specialties: string[];
  hireSpecialties: string[];
  hireAvailability: HireAvailability | null;
  hireAvailabilityLabel: string | null;
  hirePriceBand: HirePriceBand | null;
  hirePriceBandLabel: string | null;
  publicLinks: CreatorPublicLink[];
  primaryLink: CreatorPublicLink | null;
  latestClip: TalentClipSample | null;
  latestProject: TalentProjectSample | null;
  isFoundingCreator: boolean;
}

export interface TalentLandingData {
  featuredTalents: TalentSummary[];
  topSpecialties: string[];
  featuredProjects: Array<
    TalentProjectSample & {
      creatorName: string;
      creatorUsername: string;
      creatorAvatarUrl: string | null;
    }
  >;
}

const CURATED_CLIP_TAGS: Record<string, string> = {
  meme: "Meme",
  parody: "Parody",
  "short film": "Short Film",
  short_film: "Short Film",
  anime: "Anime",
  politics: "Politics",
  sports: "Sports",
  experimental: "Experimental",
  music: "Music Video",
};

const SOCIAL_LINK_META: Array<{
  key: string;
  label: string;
  kind: CreatorPublicLink["kind"];
}> = [
  { key: "twitter", label: "X", kind: "twitter" },
  { key: "youtube", label: "YouTube", kind: "youtube" },
  { key: "tiktok", label: "TikTok", kind: "tiktok" },
  { key: "discord", label: "Discord", kind: "discord" },
];

const STUDIO_HINT = /\b(studio|studios|films|pictures|collective|media|labs|works)\b/i;

function normalizeExternalUrl(raw: string | null | undefined) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function buildPublicLinks(
  websiteUrl: string | null | undefined,
  socialLinks: unknown
): CreatorPublicLink[] {
  const links: CreatorPublicLink[] = [];
  const normalizedWebsite = normalizeExternalUrl(websiteUrl);

  if (normalizedWebsite) {
    links.push({ kind: "website", label: "Website", href: normalizedWebsite });
  }

  const socials =
    socialLinks && typeof socialLinks === "object" && !Array.isArray(socialLinks)
      ? (socialLinks as Record<string, unknown>)
      : {};

  for (const meta of SOCIAL_LINK_META) {
    const value = socials[meta.key];
    if (typeof value !== "string") continue;
    const href = normalizeExternalUrl(value);
    if (!href) continue;
    links.push({ kind: meta.kind, label: meta.label, href });
  }

  return links;
}

export function buildSpecialties(
  projects: Array<{ genre: string | null; format: string | null }>,
  clips: TalentClipSample[]
) {
  const counts = new Map<string, number>();
  const add = (label: string | null | undefined, weight = 1) => {
    if (!label) return;
    const normalized = label.trim();
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) ?? 0) + weight);
  };

  for (const project of projects) {
    add(project.genre ? PROJECT_GENRE_LABELS[project.genre] ?? project.genre : null, 3);
    add(project.format ? PROJECT_FORMAT_LABELS[project.format] ?? project.format : null, 1);
  }

  for (const clip of clips) {
    add(ALL_VIDEO_GENRE_LABELS[clip.genre] ?? clip.genre, 1);
    for (const tag of clip.tags ?? []) {
      const key = tag.toLowerCase().trim();
      if (CURATED_CLIP_TAGS[key]) add(CURATED_CLIP_TAGS[key], 2);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([label]) => label);
}

function inferTalentKind(
  displayName: string,
  projectCount: number
): TalentSummary["kindLabel"] {
  return STUDIO_HINT.test(displayName) || projectCount >= 4 ? "Studio" : "Creator";
}

function buildHeadline(kindLabel: "Creator" | "Studio", specialties: string[]) {
  if (specialties.length > 0) {
    return specialties.slice(0, 3).join(" · ");
  }

  return kindLabel === "Studio" ? "AI studio portfolio" : "AI creator portfolio";
}

export function isHireAvailability(
  value: string | null
): value is HireAvailability {
  return Boolean(
    value && (HIRE_AVAILABILITY_OPTIONS as readonly string[]).includes(value)
  );
}

export function isHirePriceBand(value: string | null): value is HirePriceBand {
  return Boolean(
    value && (HIRE_PRICE_BAND_OPTIONS as readonly string[]).includes(value)
  );
}

export function deriveHireSpecialties(
  profileSpecialties: string[],
  clipCount: number,
  projectCount: number
) {
  const lowered = profileSpecialties.map((item) => item.toLowerCase());
  const results = new Set<HireSpecialty>();

  if (
    lowered.some((item) =>
      /(ads|marketing|campaign|commercial)/.test(item)
    )
  ) {
    results.add("Ads");
  }

  if (lowered.some((item) => /(music)/.test(item))) {
    results.add("Music Video");
  }

  if (lowered.some((item) => /(sound|audio|sfx)/.test(item))) {
    results.add("Sound Effect");
  }

  if (
    projectCount > 0 ||
    lowered.some((item) =>
      /(film|short film|drama|action|fantasy|sci-fi|sci fi|horror|thriller|romance|documentary|animation)/.test(
        item
      )
    )
  ) {
    results.add("Film");
  }

  if (clipCount > 0 && results.size === 0) {
    results.add("Other");
  }

  if (results.size === 0) {
    results.add("Other");
  }

  return HIRE_SPECIALTY_OPTIONS.filter((item) => results.has(item));
}

async function fetchTalentSummaries(
  supabase: SupabaseClient<any>,
  limit: number
): Promise<TalentSummary[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, avatar_url, bio, website_url, social_links, is_founding_creator, follower_count, hire_specialties, hire_availability, hire_price_band, subscriber_count, total_views, created_at"
    )
    .eq("is_creator", true)
    .order("follower_count", { ascending: false })
    .order("total_views", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (profilesError) throw profilesError;

  const profileRows = (profiles ?? []) as TalentProfileRow[];
  const creatorIds = profileRows.map((profile) => profile.id);

  if (creatorIds.length === 0) {
    return [];
  }

  const [clipsRes, projectsRes] = await Promise.all([
    supabase
      .from("videos")
      .select(
        "id, creator_id, title, thumbnail_url, published_at, created_at, view_count, like_count, comment_count, share_count, genre, tags, project_id"
      )
      .in("creator_id", creatorIds)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit * 8),
    supabase
      .from("projects")
      .select(
        "id, creator_id, slug, title, hook, genre, format, lifecycle_status, launch_mode, teaser_thumbnail_url, preorder_count_cache, purchase_count_cache, created_at"
      )
      .in("creator_id", creatorIds)
      .eq("moderation_status", "live")
      .order("created_at", { ascending: false })
      .limit(limit * 6),
  ]);

  if (clipsRes.error) throw clipsRes.error;
  if (projectsRes.error) throw projectsRes.error;

  const clipsByCreator = new Map<string, TalentClipSample[]>();
  for (const clip of (clipsRes.data ?? []) as TalentClipSample[]) {
    const list = clipsByCreator.get(clip.creator_id) ?? [];
    list.push(clip);
    clipsByCreator.set(clip.creator_id, list);
  }

  const projectsByCreator = new Map<string, TalentProjectSample[]>();
  for (const project of (projectsRes.data ?? []) as TalentProjectSample[]) {
    const creatorId = project.creator_id;
    if (!creatorId) continue;
    const list = projectsByCreator.get(creatorId) ?? [];
    list.push(project);
    projectsByCreator.set(creatorId, list);
  }

  type TalentSummaryInternal = TalentSummary & { _sortScore: number };

  return profileRows
    .map((profile) => {
      const clips = clipsByCreator.get(profile.id) ?? [];
      const projects = projectsByCreator.get(profile.id) ?? [];
      const publicLinks = buildPublicLinks(profile.website_url, profile.social_links);
      const specialties = buildSpecialties(projects, clips);
      const hireSpecialties =
        profile.hire_specialties && profile.hire_specialties.length > 0
          ? profile.hire_specialties.filter(Boolean)
          : deriveHireSpecialties(specialties, clips.length, projects.length);
      const hireAvailability = isHireAvailability(profile.hire_availability)
        ? profile.hire_availability
        : null;
      const hirePriceBand = isHirePriceBand(profile.hire_price_band)
        ? profile.hire_price_band
        : null;
      const deliveredCount = projects.filter((project) => project.lifecycle_status === "released").length;
      const kindLabel = inferTalentKind(profile.display_name ?? "", projects.length);
      const displayName = profile.display_name ?? profile.username ?? "Creator";
      const username = profile.username ?? profile.id;
      const heroImageUrl =
        clips[0]?.thumbnail_url ?? projects[0]?.teaser_thumbnail_url ?? null;

      const sortScore =
        (profile.follower_count ?? 0) * 4 +
        (profile.total_views ?? 0) * 0.015 +
        clips.length * 16 +
        projects.length * 28 +
        deliveredCount * 44 +
        (profile.is_founding_creator ? 18 : 0) +
        publicLinks.length * 6;

      const talent: TalentSummaryInternal = {
        id: profile.id,
        displayName,
        username,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        headline: buildHeadline(kindLabel, specialties),
        kindLabel,
        followerCount: profile.follower_count ?? 0,
        subscriberCount: profile.subscriber_count ?? 0,
        totalViews: profile.total_views ?? 0,
        clipCount: clips.length,
        projectCount: projects.length,
        deliveredCount,
        heroImageUrl,
        specialties,
        hireSpecialties,
        hireAvailability,
        hireAvailabilityLabel: hireAvailability
          ? HIRE_AVAILABILITY_LABELS[hireAvailability]
          : null,
        hirePriceBand,
        hirePriceBandLabel: hirePriceBand
          ? HIRE_PRICE_BAND_LABELS[hirePriceBand]
          : null,
        publicLinks,
        primaryLink: publicLinks[0] ?? null,
        latestClip: clips[0] ?? null,
        latestProject: projects[0] ?? null,
        isFoundingCreator: Boolean(profile.is_founding_creator),
        _sortScore: sortScore,
      };

      return talent;
    })
    .filter((talent) => talent.clipCount > 0 || talent.projectCount > 0 || talent.publicLinks.length > 0)
    .sort((left, right) => right._sortScore - left._sortScore)
    .map(({ _sortScore, ...talent }) => talent);
}

export async function fetchTalentLandingData(
  supabase: SupabaseClient<any>
): Promise<TalentLandingData> {
  const [talents, projectsRes] = await Promise.all([
    fetchTalentSummaries(supabase, 18),
    supabase
      .from("projects")
      .select(
        "id, slug, title, hook, genre, format, lifecycle_status, launch_mode, teaser_thumbnail_url, preorder_count_cache, purchase_count_cache, created_at, profiles!projects_creator_id_fkey(display_name, username, avatar_url)"
      )
      .eq("moderation_status", "live")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  if (projectsRes.error) throw projectsRes.error;

  const specialtyCounts = new Map<string, number>();
  for (const talent of talents) {
    for (const specialty of talent.hireSpecialties) {
      specialtyCounts.set(specialty, (specialtyCounts.get(specialty) ?? 0) + 1);
    }
  }

  const topSpecialties = HIRE_SPECIALTY_OPTIONS.filter((option) =>
    specialtyCounts.has(option)
  );

  const featuredProjects = ((projectsRes.data ?? []) as Array<
    Omit<TalentProjectSample, "creator_id"> & {
      profiles:
        | {
            display_name: string | null;
            username: string | null;
            avatar_url: string | null;
          }
        | Array<{
            display_name: string | null;
            username: string | null;
            avatar_url: string | null;
          }>
        | null;
    }
  >).map((project) => {
    const profile = Array.isArray(project.profiles)
      ? project.profiles[0] ?? null
      : project.profiles;

    return {
    ...project,
    creator_id: null,
    creatorName: profile?.display_name ?? "Unknown",
    creatorUsername: profile?.username ?? "",
    creatorAvatarUrl: profile?.avatar_url ?? null,
    };
  });

  return {
    featuredTalents: talents.slice(0, 6),
    topSpecialties,
    featuredProjects,
  };
}

export async function fetchTalentDirectoryData({
  supabase,
  query = "",
  specialty = "",
  availability = "",
  price = "",
}: {
  supabase: SupabaseClient<any>;
  query?: string;
  specialty?: string;
  availability?: string;
  price?: string;
}) {
  const talents = await fetchTalentSummaries(supabase, 48);
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSpecialty = specialty.trim().toLowerCase();
  const normalizedAvailability = availability.trim().toLowerCase();
  const normalizedPrice = price.trim().toLowerCase();

  const filtered = talents.filter((talent) => {
    const matchesSpecialty = normalizedSpecialty
      ? talent.hireSpecialties.some(
          (item) => item.toLowerCase() === normalizedSpecialty
        )
      : true;

    if (!matchesSpecialty) return false;

    if (
      normalizedAvailability &&
      talent.hireAvailability !== normalizedAvailability
    ) {
      return false;
    }

    if (normalizedPrice && talent.hirePriceBand !== normalizedPrice) {
      return false;
    }

    if (!normalizedQuery) return true;

    const haystack = [
      talent.displayName,
      talent.username,
      talent.bio ?? "",
      talent.headline,
      talent.kindLabel,
      ...talent.specialties,
      ...talent.hireSpecialties,
      talent.hireAvailabilityLabel ?? "",
      talent.hirePriceBandLabel ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const allSpecialties = HIRE_SPECIALTY_OPTIONS.filter((item) =>
    talents.some((talent) => talent.hireSpecialties.includes(item))
  );

  return {
    talents: filtered,
    allSpecialties,
  };
}
