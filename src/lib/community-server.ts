import type { CreatorPostHydrated, CreatorPostRow } from "@/lib/community";

function ensureStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function ensureVoteMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, number> = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const count = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(count) && count >= 0) {
      output[key] = Math.floor(count);
    }
  }

  return output;
}

export function normalizeCreatorPostRow(row: any): CreatorPostRow {
  return {
    id: String(row.id),
    creator_id: String(row.creator_id),
    content: typeof row.content === "string" ? row.content : "",
    post_type: row.post_type,
    image_url: row.image_url ?? null,
    poll_options: ensureStringArray(row.poll_options),
    poll_votes: ensureVoteMap(row.poll_votes),
    poll_ends_at: row.poll_ends_at ?? null,
    is_pinned: Boolean(row.is_pinned),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function hydrateCreatorPosts({
  supabase,
  posts,
  viewerId,
}: {
  supabase: any;
  posts: CreatorPostRow[];
  viewerId?: string | null;
}): Promise<CreatorPostHydrated[]> {
  if (posts.length === 0) {
    return [];
  }

  const postIds = posts.map((post) => post.id);

  const [likesRes, commentsRes, votesRes] = await Promise.all([
    supabase
      .from("post_likes")
      .select("id, post_id, user_id")
      .in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("id, post_id, user_id, content, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("poll_votes")
      .select("post_id, user_id, option_text")
      .in("post_id", postIds),
  ]);

  if (likesRes.error) throw new Error(likesRes.error.message);
  if (commentsRes.error) throw new Error(commentsRes.error.message);
  if (votesRes.error) throw new Error(votesRes.error.message);

  const likes = likesRes.data ?? [];
  const comments = commentsRes.data ?? [];
  const votes = votesRes.data ?? [];

  const commentUserIds = Array.from(
    new Set(
      comments
        .map((comment: any) => String(comment.user_id))
        .filter(Boolean)
    )
  );

  const profilesMap = new Map<string, { display_name: string; avatar_url: string | null }>();

  if (commentUserIds.length > 0) {
    const profilesRes = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", commentUserIds);

    if (profilesRes.error) throw new Error(profilesRes.error.message);

    for (const profile of profilesRes.data ?? []) {
      profilesMap.set(String(profile.id), {
        display_name: profile.display_name ?? "User",
        avatar_url: profile.avatar_url ?? null,
      });
    }
  }

  const likeCountMap = new Map<string, number>();
  const likedPostIds = new Set<string>();

  for (const like of likes as any[]) {
    const postId = String(like.post_id);
    likeCountMap.set(postId, (likeCountMap.get(postId) ?? 0) + 1);
    if (viewerId && String(like.user_id) === viewerId) {
      likedPostIds.add(postId);
    }
  }

  const commentsMap = new Map<string, CreatorPostHydrated["comments"]>();
  for (const comment of comments as any[]) {
    const postId = String(comment.post_id);
    const profile = profilesMap.get(String(comment.user_id));
    const list = commentsMap.get(postId) ?? [];
    list.push({
      id: String(comment.id),
      post_id: postId,
      user_id: String(comment.user_id),
      content: typeof comment.content === "string" ? comment.content : "",
      created_at: comment.created_at,
      user_name: profile?.display_name ?? "User",
      user_avatar: profile?.avatar_url ?? null,
    });
    commentsMap.set(postId, list);
  }

  const voteByMe = new Map<string, string>();
  for (const vote of votes as any[]) {
    const postId = String(vote.post_id);
    if (viewerId && String(vote.user_id) === viewerId) {
      voteByMe.set(postId, String(vote.option_text));
    }
  }

  return posts.map((post) => {
    const commentsForPost = commentsMap.get(post.id) ?? [];

    return {
      ...post,
      like_count: likeCountMap.get(post.id) ?? 0,
      comment_count: commentsForPost.length,
      liked_by_me: likedPostIds.has(post.id),
      vote_option: voteByMe.get(post.id) ?? null,
      comments: commentsForPost,
    };
  });
}
