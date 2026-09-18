import { slugify } from "@/lib/utils";

export const FORUM_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "feedback", label: "Feedback" },
  { value: "help", label: "Help" },
  { value: "workflow", label: "Workflow" },
  { value: "off_topic", label: "Off-topic" },
  { value: "announcements", label: "Announcements" },
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]["value"];
export type ForumSort = "latest" | "popular" | "liked";

export interface ForumCreatorSummary {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ForumCommentRecord {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body_markdown: string;
  like_count: number;
  created_at: string;
  creator: ForumCreatorSummary | null;
  likedByViewer?: boolean;
  replies?: ForumCommentRecord[];
}

export interface ForumPostSummary {
  id: string;
  user_id: string;
  title: string;
  body_markdown: string;
  excerpt: string;
  category: ForumCategory;
  tags: string[];
  like_count: number;
  comment_count: number;
  view_count: number;
  is_pinned: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  creator: ForumCreatorSummary | null;
  likedByViewer?: boolean;
  isSample?: boolean;
}

export interface ForumPostDetail extends ForumPostSummary {
  comments: ForumCommentRecord[];
}

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buildExcerpt(markdown: string) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plain.length > 180 ? `${plain.slice(0, 177).trimEnd()}...` : plain;
}

function buildPost(input: {
  id: string;
  user_id: string;
  title: string;
  body_markdown: string;
  category: ForumCategory;
  tags?: string[];
  like_count: number;
  comment_count: number;
  view_count: number;
  is_pinned?: boolean;
  created_at: string;
  creator: ForumCreatorSummary | null;
  comments?: ForumCommentRecord[];
}): ForumPostDetail {
  return {
    id: input.id,
    user_id: input.user_id,
    title: input.title,
    body_markdown: input.body_markdown,
    excerpt: buildExcerpt(input.body_markdown),
    category: input.category,
    tags: input.tags ?? [],
    like_count: input.like_count,
    comment_count: input.comment_count,
    view_count: input.view_count,
    is_pinned: input.is_pinned ?? false,
    is_published: true,
    created_at: input.created_at,
    updated_at: input.created_at,
    creator: input.creator,
    likedByViewer: false,
    isSample: true,
    comments: input.comments ?? [],
  };
}

export const FORUM_SAMPLE_POSTS: ForumPostDetail[] = [
  buildPost({
    id: "welcome-to-myriad-spring-forum",
    user_id: "sample-admin",
    title: "Welcome to the Myriad Spring Forum",
    body_markdown:
      "# Welcome\n\nUse this space to share workflow breakthroughs, ask for help, drop feedback, and compare notes on what is actually working in AI film right now.\n\n## Good first posts\n\n- a prompt that solved a scene problem\n- a workflow stack that saved you time\n- a short clip and the question you need answered\n\nKeep it specific. The best threads teach something reusable.",
    category: "announcements",
    tags: ["welcome", "community", "forum"],
    like_count: 34,
    comment_count: 2,
    view_count: 412,
    is_pinned: true,
    created_at: isoHoursAgo(72),
    creator: {
      id: "sample-admin",
      username: "admin",
      display_name: "Myriad Team",
      avatar_url: null,
    },
    comments: [
      {
        id: "welcome-comment-1",
        post_id: "welcome-to-myriad-spring-forum",
        user_id: "sample-user-1",
        parent_id: null,
        body_markdown: "Glad this is finally live. A shared troubleshooting space was overdue.",
        like_count: 4,
        created_at: isoHoursAgo(48),
        creator: {
          id: "sample-user-1",
          username: "maya",
          display_name: "Maya",
          avatar_url: null,
        },
        likedByViewer: false,
        replies: [
          {
            id: "welcome-comment-1-reply-1",
            post_id: "welcome-to-myriad-spring-forum",
            user_id: "sample-admin",
            parent_id: "welcome-comment-1",
            body_markdown: "That is the goal. Keep threads practical and reusable.",
            like_count: 1,
            created_at: isoHoursAgo(40),
            creator: {
              id: "sample-admin",
              username: "admin",
              display_name: "Myriad Team",
              avatar_url: null,
            },
            likedByViewer: false,
          },
        ],
      },
      {
        id: "welcome-comment-2",
        post_id: "welcome-to-myriad-spring-forum",
        user_id: "sample-user-2",
        parent_id: null,
        body_markdown: "Would love a weekly workflow thread once more people are here.",
        like_count: 2,
        created_at: isoHoursAgo(24),
        creator: {
          id: "sample-user-2",
          username: "sean",
          display_name: "Sean",
          avatar_url: null,
        },
        likedByViewer: false,
        replies: [],
      },
    ],
  }),
  buildPost({
    id: "best-settings-for-action-scenes-in-seedance-2",
    user_id: "sample-user-3",
    title: "Best settings for action scenes in Seedance 2?",
    body_markdown:
      "I keep getting jittery action shots when I stack fast subject motion, a handheld camera, and complex background extras.\n\n```text\nTwo warriors clash swords in a muddy courtyard, camera whipping around them...\n```\n\nRight now my best guess is:\n\n- keep the action specific but shorter\n- slow the camera way down\n- let lighting and debris do the intensity work\n\nWhat settings or prompt structures are actually holding together for you?",
    category: "help",
    tags: ["seedance", "action", "camera"],
    like_count: 18,
    comment_count: 12,
    view_count: 234,
    created_at: isoHoursAgo(3),
    creator: {
      id: "sample-user-3",
      username: "dricus",
      display_name: "Dricus",
      avatar_url: null,
    },
  }),
  buildPost({
    id: "my-first-ai-short-would-love-feedback",
    user_id: "sample-user-1",
    title: "My first AI short — would love feedback",
    body_markdown:
      "Finished a 90-second proof of concept this week. The visual continuity is mostly there but the middle act loses urgency.\n\n### I want feedback on\n\n- whether the pacing dips in scene 4\n- if the final reveal lands\n- whether the score is too aggressive\n\nOpen to blunt notes.",
    category: "feedback",
    tags: ["short-film", "critique", "pacing"],
    like_count: 11,
    comment_count: 8,
    view_count: 126,
    created_at: isoHoursAgo(5),
    creator: {
      id: "sample-user-1",
      username: "maya",
      display_name: "Maya",
      avatar_url: null,
    },
  }),
  buildPost({
    id: "character-consistency-pipeline-that-finally-held-up",
    user_id: "sample-user-4",
    title: "Character consistency pipeline that finally held up",
    body_markdown:
      "After too many failed attempts, this is the pipeline that finally stopped my lead from mutating every other scene.\n\n1. locked a single turnaround in Character Sheet\n2. exported a prompt-ready description block\n3. attached that description inside ShotForge scene assets\n4. never used the character name in prompts after that\n\nThe biggest fix was treating the visual description like canon and reusing it everywhere.",
    category: "workflow",
    tags: ["character-consistency", "shotforge", "workflow"],
    like_count: 26,
    comment_count: 6,
    view_count: 198,
    created_at: isoHoursAgo(8),
    creator: {
      id: "sample-user-4",
      username: "nora",
      display_name: "Nora",
      avatar_url: null,
    },
  }),
];

export function parseForumCategory(input: string | null | undefined): ForumCategory | "all" {
  if (!input) return "all";
  const match = FORUM_CATEGORIES.find((category) => category.value === input);
  return match?.value ?? "all";
}

export function parseForumSort(input: string | null | undefined): ForumSort {
  if (input === "popular" || input === "liked") return input;
  return "latest";
}

export function getForumCategoryLabel(category: ForumCategory) {
  return FORUM_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

export function getSeededForumPostById(id: string) {
  return FORUM_SAMPLE_POSTS.find((post) => post.id === id) ?? null;
}

export function getSeededForumPostsIfNeeded(posts: ForumPostSummary[]) {
  if (posts.length >= 8) return posts;

  const existing = new Set(posts.map((post) => post.id));
  const seeded = FORUM_SAMPLE_POSTS.filter((post) => !existing.has(post.id));
  return [...FORUM_SAMPLE_POSTS.slice(0, Math.max(4, 8 - posts.length)), ...posts]
    .filter((post, index, all) => all.findIndex((entry) => entry.id === post.id) === index)
    .sort(sortForumPosts("latest"));
}

export function getForumCategoryCounts(posts: ForumPostSummary[]) {
  const counts = Object.fromEntries(FORUM_CATEGORIES.map((category) => [category.value, 0])) as Record<
    ForumCategory,
    number
  >;

  for (const post of posts) {
    counts[post.category] += 1;
  }

  return counts;
}

export function sortForumPosts(sort: ForumSort) {
  return (left: ForumPostSummary, right: ForumPostSummary) => {
    if (left.is_pinned !== right.is_pinned) {
      return Number(right.is_pinned) - Number(left.is_pinned);
    }

    if (sort === "popular") {
      if (left.comment_count !== right.comment_count) {
        return right.comment_count - left.comment_count;
      }
    } else if (sort === "liked") {
      if (left.like_count !== right.like_count) {
        return right.like_count - left.like_count;
      }
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  };
}

export function filterAndSortForumPosts(input: {
  posts: ForumPostSummary[];
  query: string;
  category: ForumCategory | "all";
  sort: ForumSort;
}) {
  const needle = input.query.trim().toLowerCase();

  return input.posts
    .filter((post) => (input.category === "all" ? true : post.category === input.category))
    .filter((post) => {
      if (!needle) return true;
      return (
        post.title.toLowerCase().includes(needle) ||
        post.excerpt.toLowerCase().includes(needle) ||
        post.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
        post.creator?.display_name?.toLowerCase().includes(needle) ||
        post.creator?.username?.toLowerCase().includes(needle)
      );
    })
    .sort(sortForumPosts(input.sort));
}

export function buildForumExcerpt(markdown: string) {
  return buildExcerpt(markdown);
}

export function buildForumSlugTitle(title: string) {
  return slugify(title) || "forum-post";
}

