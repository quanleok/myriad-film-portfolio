import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentType, Database, Genre, Tables } from "@/types/database";
import type { VideoWithCreator } from "@/types/video";

interface GenreDefinition {
  label: string;
  description: string;
  genre?: Genre;
  genres?: Genre[];
  contentType?: ContentType;
}

const GENRE_DEFINITIONS = {
  showcase: {
    label: "Showcase",
    description: "The best AI-generated creations — prompt tests, model comparisons, and artistic experiments.",
    genres: ["showcase", "prompt_test", "model_vs_model"] as Genre[],
  },
  meme: {
    label: "Meme",
    description: "Funny AI clips, brainrot, trending edits, and meme content.",
    genre: "meme",
  },
  "short-film": {
    label: "Short Film",
    description: "Narrative AI films, mini movies, and story-driven content.",
    genre: "short_film",
  },
} as const satisfies Record<string, GenreDefinition>;

export type GenreSlug = keyof typeof GENRE_DEFINITIONS;
export type GenreSortOption = "trending" | "newest" | "most_viewed";

export const GENRE_SLUGS = Object.keys(GENRE_DEFINITIONS) as GenreSlug[];

export interface GenreCreatorSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  star_level: number;
  genre_video_count: number;
  genre_view_count: number;
}

export interface GenrePageData {
  slug: GenreSlug;
  label: string;
  description: string;
  featuredVideo: VideoWithCreator | null;
  trendingVideos: VideoWithCreator[];
  newVideos: VideoWithCreator[];
  premiumVideos: VideoWithCreator[];
  topCreators: GenreCreatorSummary[];
  videos: VideoWithCreator[];
  hasMore: boolean;
  nextCursor: number | null;
}

type VideoWithProfileRow = Tables<"videos"> & {
  profiles: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
};

type CreatorStatsRow = Pick<Tables<"videos">, "creator_id" | "view_count">;

type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "username" | "display_name" | "avatar_url" | "follower_count" | "star_level"
>;

const VIDEO_WITH_PROFILE_SELECT = `
  *,
  profiles!videos_creator_id_fkey (
    display_name,
    username,
    avatar_url
  )
`;

function mapVideoWithCreator(video: VideoWithProfileRow): VideoWithCreator {
  return {
    ...video,
    creator_name: video.profiles?.display_name ?? "Unknown",
    creator_username: video.profiles?.username ?? "",
    creator_avatar: video.profiles?.avatar_url ?? null,
  };
}

function applyGenreVideoFilters(
  query: any,
  definition: GenreDefinition,
  freeOnly: boolean
): any {
  if (definition.genres) {
    query = query.in("genre", definition.genres);
  } else if (definition.genre) {
    query = query.eq("genre", definition.genre);
  }

  if (definition.contentType) {
    query = query.eq("content_type", definition.contentType);
  }

  if (freeOnly) {
    query = query.eq("is_premium", false);
  }

  return query;
}

function applyGenreSort(
  query: any,
  sort: GenreSortOption
): any {
  if (sort === "newest") {
    return query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  if (sort === "most_viewed") {
    return query
      .order("view_count", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false });
  }

  return query
    .order("is_trending", { ascending: false })
    .order("view_count", { ascending: false })
    .order("like_count", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false });
}

export function isGenreSlug(slug: string): slug is GenreSlug {
  return slug in GENRE_DEFINITIONS;
}

export function getGenreDefinition(slug: string): GenreDefinition | null {
  if (!isGenreSlug(slug)) return null;
  return GENRE_DEFINITIONS[slug];
}

export function parseGenreSort(value: string | null | undefined): GenreSortOption {
  if (value === "newest") return "newest";
  if (value === "most_viewed") return "most_viewed";
  return "trending";
}

export async function fetchGenreFeaturedVideo({
  supabase,
  slug,
  freeOnly = false,
}: {
  supabase: SupabaseClient<Database>;
  slug: GenreSlug;
  freeOnly?: boolean;
}): Promise<VideoWithCreator | null> {
  const definition = GENRE_DEFINITIONS[slug];

  let featuredQuery = supabase
    .from("videos")
    .select(VIDEO_WITH_PROFILE_SELECT)
    .eq("is_published", true);

  featuredQuery = applyGenreVideoFilters(featuredQuery, definition, freeOnly)
    .order("is_trending", { ascending: false })
    .order("view_count", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1);

  const { data, error } = await featuredQuery;

  if (error) {
    throw error;
  }

  const featuredRow = ((data ?? [])[0] as VideoWithProfileRow | undefined) ?? null;
  return featuredRow ? mapVideoWithCreator(featuredRow) : null;
}

export async function fetchGenrePageData({
  supabase,
  slug,
  sort = "trending",
  freeOnly = false,
  cursor = 0,
  limit = 20,
}: {
  supabase: SupabaseClient<Database>;
  slug: GenreSlug;
  sort?: GenreSortOption;
  freeOnly?: boolean;
  cursor?: number;
  limit?: number;
}): Promise<GenrePageData> {
  const definition = GENRE_DEFINITIONS[slug];
  const safeLimit = Math.max(1, Math.min(limit, 40));
  const safeCursor = Math.max(0, cursor);

  let trendingQuery = supabase
    .from("videos")
    .select(VIDEO_WITH_PROFILE_SELECT)
    .eq("is_published", true);

  trendingQuery = applyGenreVideoFilters(trendingQuery, definition, freeOnly)
    .order("is_trending", { ascending: false })
    .order("view_count", { ascending: false })
    .order("like_count", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(12);

  let newestQuery = supabase
    .from("videos")
    .select(VIDEO_WITH_PROFILE_SELECT)
    .eq("is_published", true);

  newestQuery = applyGenreVideoFilters(newestQuery, definition, freeOnly)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(12);

  let premiumQuery = supabase
    .from("videos")
    .select(VIDEO_WITH_PROFILE_SELECT)
    .eq("is_published", true)
    .eq("is_premium", true);

  premiumQuery = applyGenreVideoFilters(premiumQuery, definition, freeOnly)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(12);

  let allVideosQuery = supabase
    .from("videos")
    .select(VIDEO_WITH_PROFILE_SELECT)
    .eq("is_published", true);

  allVideosQuery = applyGenreVideoFilters(allVideosQuery, definition, freeOnly);
  allVideosQuery = applyGenreSort(allVideosQuery, sort).range(
    safeCursor,
    safeCursor + safeLimit - 1
  );

  let creatorStatsQuery = supabase
    .from("videos")
    .select("creator_id, view_count")
    .eq("is_published", true);

  creatorStatsQuery = applyGenreVideoFilters(creatorStatsQuery, definition, freeOnly)
    .order("view_count", { ascending: false })
    .limit(500);

  const [trendingRes, newestRes, premiumRes, allVideosRes, creatorStatsRes] = await Promise.all([
    trendingQuery,
    newestQuery,
    premiumQuery,
    allVideosQuery,
    creatorStatsQuery,
  ]);

  if (trendingRes.error) throw trendingRes.error;
  if (newestRes.error) throw newestRes.error;
  if (premiumRes.error) throw premiumRes.error;
  if (allVideosRes.error) throw allVideosRes.error;
  if (creatorStatsRes.error) throw creatorStatsRes.error;

  const trendingVideos = (trendingRes.data ?? []).map((video) =>
    mapVideoWithCreator(video as VideoWithProfileRow)
  );
  const newVideos = (newestRes.data ?? []).map((video) =>
    mapVideoWithCreator(video as VideoWithProfileRow)
  );
  const premiumVideos = (premiumRes.data ?? []).map((video) =>
    mapVideoWithCreator(video as VideoWithProfileRow)
  );
  const videos = (allVideosRes.data ?? []).map((video) =>
    mapVideoWithCreator(video as VideoWithProfileRow)
  );

  const featuredVideo =
    trendingVideos[0] ?? newVideos[0] ?? premiumVideos[0] ?? videos[0] ?? null;

  const creatorStatsById = new Map<string, { count: number; views: number }>();

  for (const row of (creatorStatsRes.data ?? []) as CreatorStatsRow[]) {
    if (!row.creator_id) continue;

    const current = creatorStatsById.get(row.creator_id) ?? { count: 0, views: 0 };
    current.count += 1;
    current.views += row.view_count ?? 0;
    creatorStatsById.set(row.creator_id, current);
  }

  const rankedCreatorIds = Array.from(creatorStatsById.entries())
    .sort((a, b) => {
      const scoreA = a[1].count * 1000 + a[1].views;
      const scoreB = b[1].count * 1000 + b[1].views;
      return scoreB - scoreA;
    })
    .slice(0, 5)
    .map(([creatorId]) => creatorId);

  let topCreators: GenreCreatorSummary[] = [];

  if (rankedCreatorIds.length > 0) {
    const { data: creatorProfiles, error: creatorProfilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, follower_count, star_level")
      .in("id", rankedCreatorIds)
      .eq("is_creator", true);

    if (creatorProfilesError) {
      throw creatorProfilesError;
    }

    const creatorById = new Map(
      ((creatorProfiles ?? []) as ProfileRow[]).map((creator) => [creator.id, creator])
    );

    topCreators = rankedCreatorIds.flatMap((creatorId) => {
      const creator = creatorById.get(creatorId);
      if (!creator) return [];

      const stats = creatorStatsById.get(creatorId) ?? { count: 0, views: 0 };

      return [
        {
          id: creator.id,
          username: creator.username,
          display_name: creator.display_name,
          avatar_url: creator.avatar_url,
          follower_count: creator.follower_count ?? 0,
          star_level: creator.star_level ?? 0,
          genre_video_count: stats.count,
          genre_view_count: stats.views,
        },
      ];
    });
  }

  const hasMore = videos.length === safeLimit;

  return {
    slug,
    label: definition.label,
    description: definition.description,
    featuredVideo,
    trendingVideos,
    newVideos,
    premiumVideos,
    topCreators,
    videos,
    hasMore,
    nextCursor: hasMore ? safeCursor + videos.length : null,
  };
}
