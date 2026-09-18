export const CREATOR_POST_TYPES = ["text", "image", "poll", "announcement"] as const;
export const POLL_DURATIONS = ["1d", "3d", "7d", "none"] as const;

export type CreatorPostType = (typeof CREATOR_POST_TYPES)[number];
export type PollDuration = (typeof POLL_DURATIONS)[number];

export interface CreatorPostRow {
  id: string;
  creator_id: string;
  content: string;
  post_type: CreatorPostType;
  image_url: string | null;
  poll_options: string[] | null;
  poll_votes: Record<string, number>;
  poll_ends_at: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}

export interface CreatorPostHydrated extends CreatorPostRow {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  vote_option: string | null;
  comments: CommunityComment[];
}

export function isCreatorPostType(value: string): value is CreatorPostType {
  return (CREATOR_POST_TYPES as readonly string[]).includes(value);
}

export function isPollDuration(value: string): value is PollDuration {
  return (POLL_DURATIONS as readonly string[]).includes(value);
}

export function resolvePollEndsAt(duration: PollDuration): string | null {
  if (duration === "none") return null;

  const days = duration === "1d" ? 1 : duration === "3d" ? 3 : 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
