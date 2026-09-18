import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildForumExcerpt,
  filterAndSortForumPosts,
  getSeededForumPostById,
  getSeededForumPostsIfNeeded,
  parseForumSort,
  type ForumCategory,
  type ForumCommentRecord,
  type ForumCreatorSummary,
  type ForumPostDetail,
  type ForumPostSummary,
  type ForumSort,
} from "@/lib/forum";

type ForumPostRow = {
  id: string;
  user_id: string;
  title: string;
  body_markdown: string;
  category: ForumCategory;
  tags: string[] | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  is_pinned: boolean | null;
  is_published: boolean | null;
  created_at: string;
  updated_at: string;
};

type ForumCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body_markdown: string;
  like_count: number | null;
  created_at: string;
};

function buildCreatorMap(
  rows: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }>
) {
  return new Map<string, ForumCreatorSummary>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      },
    ])
  );
}

async function fetchCreators(userIds: string[]) {
  if (!userIds.length) return new Map<string, ForumCreatorSummary>();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  if (error) {
    console.error("[forum] fetch creators error:", error);
    return new Map<string, ForumCreatorSummary>();
  }

  return buildCreatorMap(data ?? []);
}

function hydrateForumPost(
  row: ForumPostRow,
  creators: Map<string, ForumCreatorSummary>
): ForumPostSummary {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    body_markdown: row.body_markdown,
    excerpt: buildForumExcerpt(row.body_markdown),
    category: row.category,
    tags: row.tags ?? [],
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    view_count: row.view_count ?? 0,
    is_pinned: row.is_pinned ?? false,
    is_published: row.is_published ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creator: creators.get(row.user_id) ?? null,
  };
}

function buildCommentTree(
  rows: ForumCommentRow[],
  creators: Map<string, ForumCreatorSummary>,
  likedCommentIds: Set<string>
) {
  const repliesByParent = new Map<string, ForumCommentRecord[]>();
  const roots: ForumCommentRecord[] = [];

  for (const row of rows) {
    const comment: ForumCommentRecord = {
      ...row,
      like_count: row.like_count ?? 0,
      creator: creators.get(row.user_id) ?? null,
      likedByViewer: likedCommentIds.has(row.id),
      replies: [],
    };

    if (row.parent_id) {
      const list = repliesByParent.get(row.parent_id) ?? [];
      list.push(comment);
      repliesByParent.set(row.parent_id, list);
      continue;
    }

    roots.push(comment);
  }

  return roots.map((comment) => ({
    ...comment,
    replies: (repliesByParent.get(comment.id) ?? []).sort(
      (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    ),
  }));
}

export async function fetchForumPostSummaries() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("forum_posts")
    .select(
      "id, user_id, title, body_markdown, category, tags, like_count, comment_count, view_count, is_pinned, is_published, created_at, updated_at"
    )
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[forum] fetch summaries error:", error);
    return getSeededForumPostsIfNeeded([]);
  }

  const creators = await fetchCreators([...(new Set((data ?? []).map((row) => row.user_id)))]);
  const posts = (data ?? []).map((row) => hydrateForumPost(row as ForumPostRow, creators));
  return getSeededForumPostsIfNeeded(posts);
}

export async function fetchFilteredForumPosts(input: {
  query: string;
  category: ForumCategory | "all";
  sort: ForumSort;
  offset?: number;
  limit?: number;
}) {
  const posts = await fetchForumPostSummaries();
  const filtered = filterAndSortForumPosts({
    posts,
    query: input.query,
    category: input.category,
    sort: input.sort,
  });
  const offset = Math.max(0, input.offset ?? 0);
  const limit = Math.max(1, input.limit ?? 20);
  return filtered.slice(offset, offset + limit);
}

export async function fetchForumPostDetail(id: string): Promise<ForumPostDetail | null> {
  const sample = getSeededForumPostById(id);
  if (sample) return sample;

  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error } = await admin
    .from("forum_posts")
    .select(
      "id, user_id, title, body_markdown, category, tags, like_count, comment_count, view_count, is_pinned, is_published, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !post || !post.is_published) {
    if (error && error.code !== "PGRST116") {
      console.error("[forum] fetch detail error:", error);
    }
    return null;
  }

  const [{ data: comments }, { data: postLike }, { data: commentLikes }] = await Promise.all([
    admin
      .from("forum_comments")
      .select("id, post_id, user_id, parent_id, body_markdown, like_count, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
    user
      ? admin.from("forum_post_likes").select("id").eq("post_id", id).eq("user_id", user.id).limit(1)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
    user
      ? admin.from("forum_comment_likes").select("comment_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] as { comment_id: string }[], error: null }),
  ]);

  const commentRows = (comments ?? []) as ForumCommentRow[];
  const creatorIds = [...new Set([post.user_id, ...commentRows.map((comment) => comment.user_id)])];
  const creators = await fetchCreators(creatorIds);
  const hydratedPost = hydrateForumPost(post as ForumPostRow, creators);
  const likedCommentIds = new Set((commentLikes ?? []).map((row) => row.comment_id));

  void admin
    .from("forum_posts")
    .update({ view_count: (post.view_count ?? 0) + 1 })
    .eq("id", id);

  return {
    ...hydratedPost,
    view_count: (post.view_count ?? 0) + 1,
    likedByViewer: Array.isArray(postLike) && postLike.length > 0,
    comments: buildCommentTree(commentRows, creators, likedCommentIds),
  };
}

export function normalizeForumSort(value?: string | null) {
  return parseForumSort(value);
}

