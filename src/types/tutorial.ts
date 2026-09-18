export type TutorialCategory =
  | "general"
  | "prompting"
  | "characters"
  | "workflow"
  | "editing"
  | "tools"
  | "getting_started";

export type TutorialDifficulty = "beginner" | "intermediate" | "advanced";

export type TutorialSort = "popular" | "newest" | "liked";

export interface TutorialAuthor {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface TutorialSummary {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  body_markdown: string;
  excerpt: string;
  cover_image_url: string | null;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author: TutorialAuthor;
}

export interface TutorialDetail extends TutorialSummary {
  viewer_has_liked: boolean;
}

export interface TutorialComment {
  id: string;
  tutorial_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  created_at: string;
  author: TutorialAuthor;
  replies: TutorialComment[];
}

export interface TutorialBrowseSidebarData {
  categoryCounts: Record<TutorialCategory, number>;
  difficultyCounts: Record<TutorialDifficulty, number>;
  popularTags: Array<{ tag: string; count: number }>;
}

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  "general",
  "prompting",
  "characters",
  "workflow",
  "editing",
  "tools",
  "getting_started",
];

export const TUTORIAL_DIFFICULTIES: TutorialDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export const TUTORIAL_SORTS: Array<{ value: TutorialSort; label: string }> = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "liked", label: "Most liked" },
];

export const TUTORIAL_CATEGORY_LABELS: Record<TutorialCategory, string> = {
  general: "All",
  prompting: "Prompting",
  characters: "Characters",
  workflow: "Workflow",
  editing: "Editing",
  tools: "Tools",
  getting_started: "Getting started",
};

export const TUTORIAL_DIFFICULTY_LABELS: Record<TutorialDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const TUTORIAL_CATEGORY_OPTIONS = TUTORIAL_CATEGORIES.map((value) => ({
  value,
  label: TUTORIAL_CATEGORY_LABELS[value],
}));

export const TUTORIAL_DIFFICULTY_OPTIONS = TUTORIAL_DIFFICULTIES.map((value) => ({
  value,
  label: TUTORIAL_DIFFICULTY_LABELS[value],
}));

export const TUTORIAL_TAG_LIMIT = 8;
export const TUTORIAL_TITLE_MAX = 140;
export const TUTORIAL_BODY_MAX = 40_000;
