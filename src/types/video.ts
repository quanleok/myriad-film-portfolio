import type { Tables, Enums } from "./database";

type ContentType = Enums<"content_type">;
type Genre = Enums<"genre">;

export type Video = Tables<"videos">;

export type VideoWithCreator = Video & {
  creator_name: string;
  creator_username: string;
  creator_avatar: string | null;
  creator_star_level?: number | null;
};

export type VideoStoryElementKind = "character" | "location" | "prop";

export interface VideoStoryCard {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
}

export interface VideoStoryElements {
  characters: VideoStoryCard[];
  locations: VideoStoryCard[];
  props: VideoStoryCard[];
}

const VIDEO_STORY_KEYS = ["characters", "locations", "props"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStoryCard(value: unknown): VideoStoryCard | null {
  if (!isPlainObject(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description =
    typeof value.description === "string" ? value.description.trim() : "";
  const imageUrl =
    typeof value.image_url === "string" && value.image_url.trim()
      ? value.image_url.trim()
      : null;

  if (!name) return null;

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
    name,
    description,
    image_url: imageUrl,
  };
}

export function normalizeVideoStoryElements(value: unknown): VideoStoryElements {
  if (!isPlainObject(value)) {
    return {
      characters: [],
      locations: [],
      props: [],
    };
  }

  const normalized: VideoStoryElements = {
    characters: [],
    locations: [],
    props: [],
  };

  VIDEO_STORY_KEYS.forEach((key) => {
    const nextCards = Array.isArray(value[key])
      ? value[key]
          .map((entry) => normalizeStoryCard(entry))
          .filter((entry): entry is VideoStoryCard => Boolean(entry))
          .slice(0, 6)
      : [];

    normalized[key] = nextCards;
  });

  return normalized;
}

export function hasVideoStoryElements(value: VideoStoryElements | null | undefined) {
  if (!value) return false;
  return VIDEO_STORY_KEYS.some((key) => value[key].length > 0);
}

export type Series = Tables<"series">;

export type Episode = Video & {
  series_id: string;
  season_number: number;
  episode_number: number;
};

export const GENRE_LABELS: Record<string, string> = {
  showcase: "Showcase",
  prompt_test: "Prompt Test",
  model_vs_model: "Model vs Model",
  meme: "Meme",
  short_film: "Short Film",
};

/** Legacy movie genres — kept for backward compatibility with existing content */
export const LEGACY_GENRE_LABELS: Record<string, string> = {
  sci_fi: "Sci-Fi",
  anime: "Anime",
  romance: "Romance",
  thriller: "Thriller",
  comedy: "Comedy",
  drama: "Drama",
  documentary: "Documentary",
  fantasy: "Fantasy",
  action: "Action",
  mystery: "Mystery",
  meme_parody: "Meme & Parody",
};

/** All video genre labels (new + legacy) for display purposes */
export const ALL_VIDEO_GENRE_LABELS: Record<string, string> = {
  ...LEGACY_GENRE_LABELS,
  ...GENRE_LABELS,
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  movie: "Movie",
  music_video: "Music Video",
  series: "Series",
  episode: "Episode",
  short: "Short",
};

export type MediaType = "video";

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  video: "Video",
};
