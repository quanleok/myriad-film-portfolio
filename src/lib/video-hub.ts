import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database";
import { type VideoWithCreator } from "@/types/video";

export const VIDEO_HUB_TAGS = [
  { value: "meme", label: "Meme", tone: "from-emerald-400/26 to-lime-500/10" },
  { value: "parody", label: "Parody", tone: "from-emerald-400/24 to-yellow-400/10" },
  { value: "shortfilm", label: "Short Film", tone: "from-emerald-300/20 to-amber-400/10" },
] as const;

export type VideoHubTag = (typeof VIDEO_HUB_TAGS)[number]["value"];

type WatchTabKind = "all" | "lane";

export interface WatchSurfaceTabOption {
  value: string;
  label: string;
  kind: WatchTabKind;
  count?: number;
}

export interface WatchSurfaceFacetOption {
  value: string;
  label: string;
  count: number;
}

export const WATCH_SURFACE_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "most_viewed", label: "Most Viewed" },
  { value: "most_liked", label: "Most Liked" },
  { value: "most_shared", label: "Most Shared" },
] as const;

export type WatchSurfaceTab = string;
export type WatchSurfaceSort = (typeof WATCH_SURFACE_SORTS)[number]["value"];
export type DerivedWatchLane = "trailers" | "parody" | "originals" | "anime";

export interface DerivedWatchSignals {
  lane: DerivedWatchLane | null;
  displayTags: string[];
  toolTags: string[];
}

export interface VideoHubLandingData {
  leadVideo: VideoWithCreator | null;
  featuredVideos: VideoWithCreator[];
  latestVideos: VideoWithCreator[];
  laneVideos: Record<VideoHubTag, VideoWithCreator[]>;
}

export interface WatchSurfaceData {
  videos: VideoWithCreator[];
  hasMore: boolean;
  nextOffset: number | null;
  tabs: WatchSurfaceTabOption[];
  popularTags: WatchSurfaceFacetOption[];
  aiTools: WatchSurfaceFacetOption[];
  featuredVideos: VideoWithCreator[];
}

type VideoWithProfileRow = Tables<"videos"> & {
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type WatchFacetSeedRow = Pick<
  Tables<"videos">,
  "genre" | "content_type" | "tags" | "ai_tool" | "published_at"
>;

const VIDEO_WITH_PROFILE_SELECT = `
  id,
  title,
  description,
  thumbnail_url,
  duration_seconds,
  published_at,
  created_at,
  view_count,
  like_count,
  comment_count,
  share_count,
  trending_score,
  creator_id,
  bunny_video_id,
  preview_video_id,
  video_url,
  genre,
  content_type,
  ai_tool,
  tags,
  is_featured,
  is_trending,
  is_editors_pick,
  pricing_model,
  is_premium,
  is_premiere,
  premiere_at,
  premiere_ended,
  ai_tool,
  profiles!videos_creator_id_fkey (
    display_name,
    username,
    avatar_url
  )
`;

const WATCH_LANE_LABELS: Record<DerivedWatchLane, string> = {
  trailers: "Trailers",
  parody: "Parody",
  originals: "Originals",
  anime: "Anime",
};

const WATCH_DISPLAY_TAG_LABELS: Record<string, string> = {
  music: "Music",
  "live action": "Live Action",
  "concept trailer": "Concept Trailer",
  reggae: "Reggae",
  disco: "Disco",
  biker: "Biker",
  sitcom: "Sitcom",
  action: "Action",
  space: "Space",
  anime: "Anime",
  commentary: "Commentary",
  "ai filmmaking": "AI Filmmaking",
};

const WATCH_TOOL_LABELS: Record<string, string> = {
  veo: "Veo",
  kling: "Kling",
  seedance: "Seedance",
  "google-flow": "Google Flow",
};

const WATCH_BASE_TAB: WatchSurfaceTabOption = {
  value: "all",
  label: "All",
  kind: "all",
};

function mapVideoWithCreator(video: VideoWithProfileRow): VideoWithCreator {
  return {
    ...video,
    creator_name: video.profiles?.display_name ?? "Unknown",
    creator_username: video.profiles?.username ?? "",
    creator_avatar: video.profiles?.avatar_url ?? null,
  };
}

function baseVideosQuery(supabase: SupabaseClient<Database>) {
  return supabase
    .from("videos")
    .select(VIDEO_WITH_PROFILE_SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .neq("content_type", "series");
}

function sanitizeSearchTerm(term: string) {
  return term.replace(/[%(),]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeFacetKey(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function isDerivedWatchLane(value: string | null | undefined): value is DerivedWatchLane {
  return value != null && value in WATCH_LANE_LABELS;
}

export function formatWatchTagLabel(value: string) {
  return WATCH_DISPLAY_TAG_LABELS[value] ?? formatLabel(value);
}

export function formatWatchAiToolLabel(value: string) {
  return WATCH_TOOL_LABELS[value] ?? formatLabel(value);
}

export function formatWatchSurfaceTabLabel(tab: WatchSurfaceTab) {
  if (!tab || tab === "all") return "All";
  return isDerivedWatchLane(tab) ? WATCH_LANE_LABELS[tab] : formatLabel(tab);
}

function applySearchFilter(
  query: ReturnType<typeof baseVideosQuery>,
  searchTerm: string
) {
  const safeTerm = sanitizeSearchTerm(searchTerm);
  if (!safeTerm) return query;

  if (!safeTerm.includes(" ")) {
    return query.or(
      `title.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%,tags.cs.{${safeTerm.toLowerCase()}}`
    );
  }

  return query.or(`title.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%`);
}

function applyHubTagFilter(
  query: ReturnType<typeof baseVideosQuery>,
  tag: VideoHubTag | null
) {
  switch (tag) {
    case "meme":
      return query.eq("genre", "meme");
    case "shortfilm":
      return query.eq("genre", "short_film");
    case "parody":
      return query.contains("tags", ["parody"]);
    default:
      return query;
  }
}

function createCountMap(entries: string[]) {
  const map = new Map<string, number>();
  entries.forEach((entry) => {
    const next = entry.trim();
    if (!next) return;
    map.set(next, (map.get(next) ?? 0) + 1);
  });
  return map;
}

function sortFacetEntries(entries: Map<string, number>) {
  return Array.from(entries.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
}

type WatchDerivedVideo = {
  video: VideoWithCreator;
  signals: DerivedWatchSignals;
};

function pushUnique(values: string[], value: string | null | undefined) {
  if (!value) return;
  const normalized = normalizeFacetKey(value);
  if (!normalized || values.includes(normalized)) return;
  values.push(normalized);
}

function hasAny(haystack: string, patterns: string[]) {
  return patterns.some((pattern) => haystack.includes(pattern));
}

function normalizeWatchToolValue(value: string | null | undefined) {
  const normalized = normalizeFacetKey(value ?? "");
  if (!normalized) return null;
  if (normalized.includes("veo")) return "veo";
  if (normalized.includes("kling")) return "kling";
  if (normalized.includes("seedance")) return "seedance";
  if (normalized.includes("google flow")) return "google-flow";
  return normalized;
}

function isLowValueWatchTag(value: string) {
  return new Set([
    "sci fi",
    "short",
    "movie",
    "series",
    "episode",
    "music video",
    "video",
    "clip",
  ]).has(value);
}

export function deriveWatchSignals(video: VideoWithCreator): DerivedWatchSignals {
  const creatorBlob = normalizeFacetKey(
    `${video.creator_name ?? ""} ${video.creator_username ?? ""}`
  );
  const titleBlob = normalizeFacetKey(video.title ?? "");
  const descriptionBlob = normalizeFacetKey(video.description ?? "");
  const haystack = `${titleBlob} ${descriptionBlob} ${creatorBlob}`;

  const explicitTags = (video.tags ?? [])
    .map((tag) => normalizeFacetKey(tag))
    .filter(Boolean);

  const toolTags: string[] = [];
  const explicitTool = normalizeWatchToolValue(video.ai_tool);
  pushUnique(toolTags, explicitTool);
  ["veo", "kling", "seedance", "google flow"].forEach((pattern) => {
    if (haystack.includes(pattern)) {
      pushUnique(toolTags, normalizeWatchToolValue(pattern));
    }
  });

  const isSagaLore =
    creatorBlob.includes("saga lore ai") || creatorBlob.includes("sagalore");
  const isTeaserUniverse =
    creatorBlob.includes("teaser universe") || creatorBlob.includes("teaseruniverse");
  const isRogueCell =
    creatorBlob.includes("rogue cell pictures") || creatorBlob.includes("roguecell");
  const isPsyopAnime =
    creatorBlob.includes("psyopanime") || titleBlob.includes("anime");
  const isRogueCommentary =
    isRogueCell &&
    hasAny(haystack, ["think again", "next frontier", "craziest ai model"]);

  let lane: DerivedWatchLane | null = null;

  if (
    isSagaLore ||
    hasAny(haystack, ["parody", "music video", "disco", "reggae", "sitcom", "irie"])
  ) {
    lane = "parody";
  } else if (
    isTeaserUniverse ||
    hasAny(haystack, ["trailer", "first trailer", "concept version", "live action"])
  ) {
    lane = "trailers";
  } else if (isPsyopAnime) {
    lane = "anime";
  } else if (
    (isRogueCell && !isRogueCommentary) ||
    hasAny(haystack, [
      "official trailer",
      "action film",
      "award winning",
      "space journey",
      "made with google flow",
      "original series",
      "ai film",
      "lo pan",
      "vel astra",
    ])
  ) {
    lane = "originals";
  }

  const displayTags: string[] = [];

  explicitTags.forEach((tag) => {
    if (isLowValueWatchTag(tag)) return;
    if (toolTags.includes(normalizeWatchToolValue(tag) ?? "")) return;
    pushUnique(displayTags, tag);
  });

  if (isSagaLore || hasAny(haystack, ["music video", "intro music", "funk", "song"])) {
    pushUnique(displayTags, "music");
  }
  if (hasAny(haystack, ["reggae", "jah", "irie", "rasta"])) pushUnique(displayTags, "reggae");
  if (hasAny(haystack, ["disco", "funk"])) pushUnique(displayTags, "disco");
  if (haystack.includes("biker")) pushUnique(displayTags, "biker");
  if (haystack.includes("sitcom")) pushUnique(displayTags, "sitcom");
  if (haystack.includes("live action")) pushUnique(displayTags, "live-action");
  if (haystack.includes("concept version")) pushUnique(displayTags, "concept-trailer");
  if (hasAny(haystack, ["action", "action film", "west"])) pushUnique(displayTags, "action");
  if (hasAny(haystack, ["space journey", "hole in the sky", "vel astra", "space"])) {
    pushUnique(displayTags, "space");
  }
  if (
    isRogueCommentary ||
    hasAny(haystack, ["top 10", "next frontier", "craziest ai model", "think again"])
  ) {
    pushUnique(displayTags, "commentary");
  }
  if (hasAny(haystack, ["ai filmmaking", "ai film"])) {
    pushUnique(displayTags, "ai-filmmaking");
  }
  if (lane !== "anime" && isPsyopAnime) {
    pushUnique(displayTags, "anime");
  }

  return {
    lane,
    displayTags,
    toolTags,
  };
}

function buildDerivedSearchBlob(video: VideoWithCreator, signals: DerivedWatchSignals) {
  return normalizeFacetKey(
    [
      video.title,
      video.description,
      video.creator_name,
      video.creator_username,
      video.ai_tool,
      ...(video.tags ?? []),
      signals.lane ? WATCH_LANE_LABELS[signals.lane] : "",
      ...signals.displayTags.map((value) => formatWatchTagLabel(value)),
      ...signals.toolTags.map((value) => formatWatchAiToolLabel(value)),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildWatchTabs(items: WatchDerivedVideo[]): WatchSurfaceTabOption[] {
  if (items.length === 0) return [WATCH_BASE_TAB];

  const laneCounts = createCountMap(
    items.map((item) => item.signals.lane).filter(Boolean) as string[]
  );

  const tabs: WatchSurfaceTabOption[] = [WATCH_BASE_TAB];
  (["trailers", "parody", "originals", "anime"] as DerivedWatchLane[]).forEach((lane) => {
    const count = laneCounts.get(lane) ?? 0;
    if (count < 2) return;
    tabs.push({
      value: lane,
      label: WATCH_LANE_LABELS[lane],
      kind: "lane",
      count,
    });
  });

  return tabs;
}

function buildPopularTags(items: WatchDerivedVideo[]) {
  const tagCounts = createCountMap(
    items.flatMap((item) => item.signals.displayTags)
  );

  return sortFacetEntries(tagCounts)
    .filter(([, count]) => count >= 2)
    .slice(0, 10)
    .map(([value, count]) => ({
      value,
      label: formatWatchTagLabel(value),
      count,
    }));
}

function buildAiToolOptions(items: WatchDerivedVideo[]) {
  const toolCounts = createCountMap(
    items.flatMap((item) => item.signals.toolTags)
  );

  return sortFacetEntries(toolCounts)
    .filter(([, count]) => count >= 2)
    .slice(0, 8)
    .map(([value, count]) => ({
      value,
      label: formatWatchAiToolLabel(value),
      count,
    }));
}

function matchesWatchSearch(
  item: WatchDerivedVideo,
  searchTerm: string
) {
  const normalized = normalizeFacetKey(searchTerm);
  if (!normalized) return true;
  return buildDerivedSearchBlob(item.video, item.signals).includes(normalized);
}

function matchesWatchTab(item: WatchDerivedVideo, tab: WatchSurfaceTab) {
  if (!tab || tab === "all") return true;
  return item.signals.lane === tab;
}

function matchesWatchTag(item: WatchDerivedVideo, tag: string | null) {
  const normalized = normalizeFacetKey(tag ?? "");
  if (!normalized) return true;
  const explicitTags = (item.video.tags ?? []).map((value) => normalizeFacetKey(value));
  return (
    item.signals.displayTags.includes(normalized) ||
    explicitTags.includes(normalized)
  );
}

function matchesWatchAiTool(item: WatchDerivedVideo, aiTool: string | null) {
  const normalized = normalizeWatchToolValue(aiTool);
  if (!normalized) return true;
  return item.signals.toolTags.includes(normalized);
}

function comparePublishedDates(a: VideoWithCreator, b: VideoWithCreator) {
  const aTime = new Date(a.published_at ?? a.created_at ?? 0).getTime();
  const bTime = new Date(b.published_at ?? b.created_at ?? 0).getTime();
  return bTime - aTime;
}

function sortWatchVideos(items: WatchDerivedVideo[], sort: WatchSurfaceSort) {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "newest":
        return comparePublishedDates(a.video, b.video);
      case "most_viewed":
        return (
          (b.video.view_count ?? 0) - (a.video.view_count ?? 0) ||
          comparePublishedDates(a.video, b.video)
        );
      case "most_liked":
        return (
          (b.video.like_count ?? 0) - (a.video.like_count ?? 0) ||
          comparePublishedDates(a.video, b.video)
        );
      case "most_shared":
        return (
          (b.video.share_count ?? 0) - (a.video.share_count ?? 0) ||
          comparePublishedDates(a.video, b.video)
        );
      case "trending":
      default:
        return (
          Number(Boolean(b.video.is_editors_pick)) - Number(Boolean(a.video.is_editors_pick)) ||
          Number(Boolean(b.video.is_trending)) - Number(Boolean(a.video.is_trending)) ||
          (b.video.trending_score ?? 0) - (a.video.trending_score ?? 0) ||
          comparePublishedDates(a.video, b.video)
        );
    }
  });
}

export function parseVideoHubTag(value: string | null | undefined): VideoHubTag | null {
  if (!value) return null;
  return VIDEO_HUB_TAGS.find((item) => item.value === value)?.value ?? null;
}

export function parseWatchSurfaceTab(
  value: string | null | undefined
): WatchSurfaceTab {
  if (!value) return "all";
  const raw = value.trim().toLowerCase();
  const normalized = normalizeFacetKey(value);
  if (normalized === "all") return "all";

  const legacyMap: Record<string, WatchSurfaceTab> = {
    parody: "parody",
    anime: "anime",
    "tag:parody": "parody",
    "genre:anime": "anime",
  };

  if (legacyMap[raw]) return legacyMap[raw];
  if (isDerivedWatchLane(normalized)) return normalized;
  return "all";
}

export function parseWatchSurfaceSort(
  value: string | null | undefined
): WatchSurfaceSort {
  if (!value) return "newest";
  return WATCH_SURFACE_SORTS.find((item) => item.value === value)?.value ?? "newest";
}

function buildLaneQuery(
  supabase: SupabaseClient<Database>,
  tag: VideoHubTag
) {
  return applyHubTagFilter(baseVideosQuery(supabase), tag)
    .order("is_trending", { ascending: false })
    .order("trending_score", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(10);
}

export async function fetchVideoHubLandingData({
  supabase,
  query = "",
  tag = null,
}: {
  supabase: SupabaseClient<Database>;
  query?: string;
  tag?: VideoHubTag | null;
}): Promise<VideoHubLandingData> {
  const hasFilters = Boolean(query.trim() || tag);

  const featuredQuery = baseVideosQuery(supabase)
    .order("is_featured", { ascending: false })
    .order("is_editors_pick", { ascending: false })
    .order("is_trending", { ascending: false })
    .order("trending_score", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(6);

  const latestQuery = applySearchFilter(
    applyHubTagFilter(baseVideosQuery(supabase), tag),
    query
  )
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(hasFilters ? 18 : 16);

  const laneQueries = VIDEO_HUB_TAGS.map((item) => buildLaneQuery(supabase, item.value));

  const results = await Promise.all([featuredQuery, latestQuery, ...laneQueries]);
  const [featuredRes, latestRes, ...laneResults] = results;

  if (featuredRes.error) throw featuredRes.error;
  if (latestRes.error) throw latestRes.error;

  laneResults.forEach((result) => {
    if (result.error) throw result.error;
  });

  const featuredVideos = (featuredRes.data ?? []).map((video) =>
    mapVideoWithCreator(video as VideoWithProfileRow)
  );
  const latestVideos = (latestRes.data ?? []).map((video) =>
    mapVideoWithCreator(video as VideoWithProfileRow)
  );

  const laneVideos = VIDEO_HUB_TAGS.reduce(
    (acc, item, index) => {
      acc[item.value] = ((laneResults[index]?.data ?? []) as VideoWithProfileRow[]).map((video) =>
        mapVideoWithCreator(video)
      );
      return acc;
    },
    {} as Record<VideoHubTag, VideoWithCreator[]>
  );

  const leadVideo =
    featuredVideos[0] ??
    latestVideos[0] ??
    VIDEO_HUB_TAGS.map((item) => laneVideos[item.value][0]).find(Boolean) ??
    null;

  return {
    leadVideo,
    featuredVideos,
    latestVideos,
    laneVideos,
  };
}

export async function fetchWatchSurfaceData({
  supabase,
  query = "",
  tab = "all",
  sort = "newest",
  tag = null,
  aiTool = null,
  offset = 0,
  limit = 20,
}: {
  supabase: SupabaseClient<Database>;
  query?: string;
  tab?: WatchSurfaceTab;
  sort?: WatchSurfaceSort;
  tag?: string | null;
  aiTool?: string | null;
  offset?: number;
  limit?: number;
}): Promise<WatchSurfaceData> {
  const clampedOffset = Math.max(0, offset);
  const clampedLimit = Math.min(Math.max(limit, 1), 40);

  const response = await baseVideosQuery(supabase)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (response.error) throw response.error;

  const derivedVideos = ((response.data ?? []) as VideoWithProfileRow[]).map((row) => {
    const video = mapVideoWithCreator(row);
    return {
      video,
      signals: deriveWatchSignals(video),
    } satisfies WatchDerivedVideo;
  });

  // Enforce 2-minute minimum for Watch surface
  const MIN_WATCH_DURATION_SECONDS = 120;

  const filteredVideos = sortWatchVideos(
    derivedVideos.filter((item) => {
      const duration = item.video.duration_seconds ?? 0;
      return (
        duration >= MIN_WATCH_DURATION_SECONDS &&
        matchesWatchSearch(item, query) &&
        matchesWatchTab(item, tab) &&
        matchesWatchTag(item, tag) &&
        matchesWatchAiTool(item, aiTool)
      );
    }),
    sort
  );

  const pagedVideos = filteredVideos
    .slice(clampedOffset, clampedOffset + clampedLimit)
    .map((item) => item.video);

  return {
    videos: pagedVideos,
    hasMore: filteredVideos.length > clampedOffset + clampedLimit,
    nextOffset:
      filteredVideos.length > clampedOffset + clampedLimit
        ? clampedOffset + clampedLimit
        : null,
    tabs: buildWatchTabs(derivedVideos),
    popularTags: buildPopularTags(derivedVideos),
    aiTools: buildAiToolOptions(derivedVideos),
    featuredVideos: [],
  };
}
