export type CategorySlug =
  | "reasoning"
  | "coding"
  | "video"
  | "image"
  | "agents"
  | "news";

export type CategoryAccent = "emerald" | "cyan" | "amber" | "pink" | "violet" | "red";
export type LeaderboardLens = "overall" | "value" | "creative" | "velocity";
export type PostType =
  | "news"
  | "review"
  | "comparison"
  | "workflow"
  | "question"
  | "hot_take"
  | "release";
export type MovementDirection = "up" | "down" | "new" | "steady";

export interface Category {
  slug: CategorySlug;
  name: string;
  tagline: string;
  description: string;
  accent: CategoryAccent;
  icon: string;
}

export interface Tool {
  id: string;
  slug: string;
  name: string;
  company: string;
  category: CategorySlug;
  summary: string;
  website: string;
  pricing: string;
  bestFor: string[];
  strengths: string[];
  weaknesses: string[];
  changeSummary: string;
  discussionVolume: number;
  savedCount: number;
}

export interface LeaderboardEntry {
  id: string;
  category: CategorySlug;
  lens: LeaderboardLens;
  toolSlug: string;
  rank: number;
  previousRank: number | null;
  score: number;
  editorialWeight: number;
  communityWeight: number;
  velocityWeight: number;
  rationale: string;
  movement: MovementDirection;
}

export interface PersonProfile {
  id: string;
  handle: string;
  name: string;
  role: string;
  expertise: CategorySlug[];
  credibilityLabel: string;
  bio: string;
  followerCount: number;
  postCount: number;
}

export interface FeedPost {
  id: string;
  category: CategorySlug;
  postType: PostType;
  authorHandle: string;
  title: string;
  body: string;
  linkedToolSlugs: string[];
  externalUrl: string | null;
  reactionCount: number;
  commentCount: number;
  createdAt: string;
}

export interface TrendEvent {
  id: string;
  category: CategorySlug;
  label: string;
  summary: string;
  movement: MovementDirection;
  signalScore: number;
  references: string[];
}

export interface ToolRelease {
  id: string;
  toolSlug: string;
  label: string;
  note: string;
  releasedAt: string;
}

export interface AppStat {
  label: string;
  value: string;
  note: string;
}
