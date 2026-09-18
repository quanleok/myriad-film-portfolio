import { stripHtmlTags, slugify } from "@/lib/utils";
import type {
  TutorialAuthor,
  TutorialBrowseSidebarData,
  TutorialCategory,
  TutorialComment,
  TutorialDetail,
  TutorialDifficulty,
  TutorialSummary,
} from "@/types/tutorial";
import {
  TUTORIAL_BODY_MAX,
  TUTORIAL_CATEGORIES,
  TUTORIAL_DIFFICULTIES,
  TUTORIAL_TAG_LIMIT,
} from "@/types/tutorial";

type SupabaseLikeClient = {
  from: (table: string) => any;
};

interface RawProfile {
  id?: string | null;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface RawTutorialRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  body_markdown: string | null;
  cover_image_url: string | null;
  category: string | null;
  difficulty: string | null;
  tags: string[] | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  is_featured: boolean | null;
  is_published: boolean | null;
  created_at: string;
  updated_at: string;
  profiles?: RawProfile | RawProfile[] | null;
}

interface LegacyTutorialRow {
  id: string;
  creator_id: string;
  slug: string;
  title: string;
  body: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: RawProfile | RawProfile[] | null;
}

interface RawTutorialLikeRow {
  tutorial_id: string;
}

interface RawTutorialCommentRow {
  id: string;
  tutorial_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  like_count: number | null;
  created_at: string;
  profiles?: RawProfile | RawProfile[] | null;
}

export interface TutorialBrowseParams {
  q?: string;
  category?: string;
  difficulty?: string;
  tag?: string;
  sort?: string;
  offset?: number;
  limit?: number;
}

interface QueryErrorLike {
  code?: string | null;
  message?: string | null;
}

function getProfileAuthor(profile: RawProfile | RawProfile[] | null | undefined, fallbackId: string): TutorialAuthor {
  const value = Array.isArray(profile) ? profile[0] : profile;
  return {
    id: value?.id ?? fallbackId,
    display_name: value?.display_name ?? null,
    username: value?.username ?? null,
    avatar_url: value?.avatar_url ?? null,
  };
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/^>\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isTutorialsSchemaCompatError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as QueryErrorLike;
  if (candidate.code === "42703" || candidate.code === "42P01" || candidate.code === "PGRST200") {
    return true;
  }

  return (
    typeof candidate.message === "string" &&
    candidate.message.toLowerCase().includes("tutorial")
  );
}

export function getTutorialExcerpt(markdown: string | null | undefined, maxLength = 180): string {
  const candidate = stripMarkdown(stripHtmlTags(markdown ?? ""));
  if (!candidate) return "";
  if (candidate.length <= maxLength) return candidate;
  return `${candidate.slice(0, maxLength).trimEnd()}...`;
}

export function normalizeTutorialCategory(value: string | null | undefined): TutorialCategory {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (TUTORIAL_CATEGORIES.includes(normalized as TutorialCategory)) {
    return normalized as TutorialCategory;
  }

  return "general";
}

export function normalizeTutorialDifficulty(value: string | null | undefined): TutorialDifficulty {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (TUTORIAL_DIFFICULTIES.includes(normalized as TutorialDifficulty)) {
    return normalized as TutorialDifficulty;
  }
  return "beginner";
}

export function sanitizeTutorialTitle(value: string): string {
  return stripHtmlTags(value).replace(/\s+/g, " ").trim().slice(0, 140);
}

export function sanitizeTutorialBody(value: string): string {
  return String(value ?? "").slice(0, TUTORIAL_BODY_MAX).trim();
}

export function sanitizeTutorialTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of value) {
    const normalized = String(item ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .trim()
      .slice(0, 32);

    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    tags.push(normalized);

    if (tags.length >= TUTORIAL_TAG_LIMIT) break;
  }

  return tags;
}

export function formatTutorialTagLabel(tag: string): string {
  return tag
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function mapTutorialSummary(row: RawTutorialRow): TutorialSummary {
  return {
    id: row.id,
    user_id: row.user_id,
    slug: row.slug,
    title: row.title,
    body_markdown: row.body_markdown ?? "",
    excerpt: getTutorialExcerpt(row.body_markdown),
    cover_image_url: row.cover_image_url,
    category: normalizeTutorialCategory(row.category),
    difficulty: normalizeTutorialDifficulty(row.difficulty),
    tags: sanitizeTutorialTags(row.tags ?? []),
    view_count: row.view_count ?? 0,
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    is_featured: row.is_featured ?? false,
    is_published: row.is_published ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: getProfileAuthor(row.profiles, row.user_id),
  };
}

function mapLegacyTutorialSummary(row: LegacyTutorialRow): TutorialSummary {
  return {
    id: row.id,
    user_id: row.creator_id,
    slug: row.slug,
    title: row.title,
    body_markdown: row.body ?? "",
    excerpt: getTutorialExcerpt(row.body),
    cover_image_url: row.thumbnail_url,
    category: "general",
    difficulty: "beginner",
    tags: [],
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    is_featured: false,
    is_published: Boolean(row.published_at),
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: getProfileAuthor(row.profiles, row.creator_id),
  };
}

export function mapTutorialDetail(
  row: RawTutorialRow,
  likes: RawTutorialLikeRow[] | null | undefined = []
): TutorialDetail {
  return {
    ...mapTutorialSummary(row),
    viewer_has_liked: Boolean(likes?.length),
  };
}

function mapLegacyTutorialDetail(row: LegacyTutorialRow): TutorialDetail {
  return {
    ...mapLegacyTutorialSummary(row),
    viewer_has_liked: false,
  };
}

export function groupTutorialComments(rows: RawTutorialCommentRow[] | null | undefined): TutorialComment[] {
  if (!rows?.length) return [];

  const byParent = new Map<string, TutorialComment[]>();
  const topLevel: TutorialComment[] = [];

  for (const row of rows) {
    const comment: TutorialComment = {
      id: row.id,
      tutorial_id: row.tutorial_id,
      user_id: row.user_id,
      parent_id: row.parent_id,
      body: row.body,
      like_count: row.like_count ?? 0,
      created_at: row.created_at,
      author: getProfileAuthor(row.profiles, row.user_id),
      replies: [],
    };

    if (row.parent_id) {
      const bucket = byParent.get(row.parent_id) ?? [];
      bucket.push(comment);
      byParent.set(row.parent_id, bucket);
      continue;
    }

    topLevel.push(comment);
  }

  topLevel.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const comment of topLevel) {
    const replies = byParent.get(comment.id) ?? [];
    replies.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    comment.replies = replies;
  }

  return topLevel;
}

export async function generateUniqueTutorialSlug(
  supabase: SupabaseLikeClient,
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title).slice(0, 72) || "tutorial";
  let candidate = base;
  let suffix = 2;

  for (;;) {
    let query = supabase.from("tutorials").select("id").eq("slug", candidate).limit(1);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function fetchLegacyTutorialSidebarData(
  supabase: SupabaseLikeClient
): Promise<TutorialBrowseSidebarData> {
  const { data, error } = await supabase
    .from("tutorials")
    .select("id")
    .not("published_at", "is", null)
    .limit(250);

  if (error) throw error;

  return {
    categoryCounts: {
      general: data?.length ?? 0,
      prompting: 0,
      characters: 0,
      workflow: 0,
      editing: 0,
      tools: 0,
      getting_started: 0,
    },
    difficultyCounts: {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    },
    popularTags: [],
  };
}

export async function fetchTutorialSidebarData(
  supabase: SupabaseLikeClient
): Promise<TutorialBrowseSidebarData> {
  const categoryCounts = {
    general: 0,
    prompting: 0,
    characters: 0,
    workflow: 0,
    editing: 0,
    tools: 0,
    getting_started: 0,
  } satisfies Record<TutorialCategory, number>;

  const difficultyCounts = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  } satisfies Record<TutorialDifficulty, number>;

  const tagCounts = new Map<string, number>();

  try {
    const { data, error } = await supabase
      .from("tutorials")
      .select("category, difficulty, tags")
      .eq("is_published", true)
      .limit(250);

    if (error) throw error;

    for (const row of (data ?? []) as Array<{
      category: string | null;
      difficulty: string | null;
      tags: string[] | null;
    }>) {
      const category = normalizeTutorialCategory(row.category);
      const difficulty = normalizeTutorialDifficulty(row.difficulty);

      categoryCounts[category] += 1;
      difficultyCounts[difficulty] += 1;

      for (const tag of sanitizeTutorialTags(row.tags ?? [])) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return {
      categoryCounts,
      difficultyCounts,
      popularTags: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
    };
  } catch (error) {
    if (!isTutorialsSchemaCompatError(error)) {
      throw error;
    }

    return fetchLegacyTutorialSidebarData(supabase);
  }
}

async function fetchLegacyTutorialList(
  supabase: SupabaseLikeClient,
  params: TutorialBrowseParams,
  offset: number,
  limit: number,
  queryText: string
): Promise<{
  tutorials: TutorialSummary[];
  total: number;
  sidebar: TutorialBrowseSidebarData;
}> {
  let query = supabase
    .from("tutorials")
    .select(
      "id, creator_id, slug, title, body, thumbnail_url, published_at, created_at, updated_at, profiles!tutorials_creator_id_fkey(id, display_name, username, avatar_url)",
      { count: "exact" }
    )
    .not("published_at", "is", null);

  if (queryText) {
    const escaped = queryText.replace(/[%_,]/g, " ");
    query = query.or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`);
  }

  switch (params.sort) {
    case "newest":
      query = query.order("published_at", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "liked":
    case "popular":
    default:
      query = query.order("published_at", { ascending: false }).order("created_at", { ascending: false });
      break;
  }

  query = query.range(offset, offset + limit - 1);

  const [{ data, error, count }, sidebar] = await Promise.all([
    query,
    fetchLegacyTutorialSidebarData(supabase),
  ]);

  if (error) throw error;

  return {
    tutorials: ((data ?? []) as LegacyTutorialRow[]).map(mapLegacyTutorialSummary),
    total: count ?? 0,
    sidebar,
  };
}

export async function fetchTutorialList(
  supabase: SupabaseLikeClient,
  params: TutorialBrowseParams
): Promise<{
  tutorials: TutorialSummary[];
  total: number;
  sidebar: TutorialBrowseSidebarData;
}> {
  const rawLimit = Number(params.limit ?? 24);
  const rawOffset = Number(params.offset ?? 0);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 24, 1), 48);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
  const category = normalizeTutorialCategory(params.category);
  const difficulty =
    params.difficulty && params.difficulty !== "all"
      ? normalizeTutorialDifficulty(params.difficulty)
      : null;
  const tag =
    typeof params.tag === "string" && params.tag.trim().length > 0
      ? sanitizeTutorialTags([params.tag])[0] ?? null
      : null;
  const queryText = String(params.q ?? "").trim();

  try {
    let query = supabase
      .from("tutorials")
      .select(
        "id, user_id, slug, title, body_markdown, cover_image_url, category, difficulty, tags, view_count, like_count, comment_count, is_featured, is_published, created_at, updated_at, profiles!tutorials_user_id_fkey(id, display_name, username, avatar_url)",
        { count: "exact" }
      )
      .eq("is_published", true);

    if (category !== "general") {
      query = query.eq("category", category);
    }

    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    if (queryText) {
      const escaped = queryText.replace(/[%_,]/g, " ");
      query = query.or(`title.ilike.%${escaped}%,body_markdown.ilike.%${escaped}%`);
    }

    switch (params.sort) {
      case "liked":
        query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "popular":
      default:
        query = query
          .order("is_featured", { ascending: false })
          .order("like_count", { ascending: false })
          .order("view_count", { ascending: false })
          .order("comment_count", { ascending: false })
          .order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const [{ data, error, count }, sidebar] = await Promise.all([
      query,
      fetchTutorialSidebarData(supabase),
    ]);

    if (error) throw error;

    return {
      tutorials: ((data ?? []) as RawTutorialRow[]).map(mapTutorialSummary),
      total: count ?? 0,
      sidebar,
    };
  } catch (error) {
    if (!isTutorialsSchemaCompatError(error)) {
      throw error;
    }

    return fetchLegacyTutorialList(supabase, params, offset, limit, queryText);
  }
}

async function fetchLegacyTutorialBySlug(
  supabase: SupabaseLikeClient,
  slug: string
): Promise<TutorialDetail | null> {
  const { data, error } = await supabase
    .from("tutorials")
    .select(
      "id, creator_id, slug, title, body, thumbnail_url, published_at, created_at, updated_at, profiles!tutorials_creator_id_fkey(id, display_name, username, avatar_url)"
    )
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapLegacyTutorialDetail(data as LegacyTutorialRow);
}

export async function fetchTutorialBySlug(
  supabase: SupabaseLikeClient,
  slug: string,
  viewerId?: string | null
): Promise<TutorialDetail | null> {
  try {
    const { data, error } = await supabase
      .from("tutorials")
      .select(
        "id, user_id, slug, title, body_markdown, cover_image_url, category, difficulty, tags, view_count, like_count, comment_count, is_featured, is_published, created_at, updated_at, profiles!tutorials_user_id_fkey(id, display_name, username, avatar_url)"
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let likes: RawTutorialLikeRow[] = [];

    if (viewerId) {
      const { data: likedRows, error: likeError } = await supabase
        .from("tutorial_likes")
        .select("tutorial_id")
        .eq("tutorial_id", data.id)
        .eq("user_id", viewerId)
        .limit(1);

      if (likeError) throw likeError;
      likes = (likedRows ?? []) as RawTutorialLikeRow[];
    }

    return mapTutorialDetail(data as RawTutorialRow, likes);
  } catch (error) {
    if (!isTutorialsSchemaCompatError(error)) {
      throw error;
    }

    return fetchLegacyTutorialBySlug(supabase, slug);
  }
}

async function fetchLegacyTutorialForEditor(
  supabase: SupabaseLikeClient,
  tutorialRef: string,
  userId: string
): Promise<TutorialDetail | null> {
  const query = supabase
    .from("tutorials")
    .select(
      "id, creator_id, slug, title, body, thumbnail_url, published_at, created_at, updated_at, profiles!tutorials_creator_id_fkey(id, display_name, username, avatar_url)"
    )
    .eq("creator_id", userId);

  const { data, error } =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      tutorialRef
    )
      ? await query.eq("id", tutorialRef).maybeSingle()
      : await query.eq("slug", tutorialRef).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapLegacyTutorialDetail(data as LegacyTutorialRow);
}

export async function fetchTutorialForEditor(
  supabase: SupabaseLikeClient,
  tutorialRef: string,
  userId: string
): Promise<TutorialDetail | null> {
  try {
    const query = supabase
      .from("tutorials")
      .select(
        "id, user_id, slug, title, body_markdown, cover_image_url, category, difficulty, tags, view_count, like_count, comment_count, is_featured, is_published, created_at, updated_at, profiles!tutorials_user_id_fkey(id, display_name, username, avatar_url)"
      )
      .eq("user_id", userId);

    const { data, error } =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        tutorialRef
      )
        ? await query.eq("id", tutorialRef).maybeSingle()
        : await query.eq("slug", tutorialRef).maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapTutorialDetail(data as RawTutorialRow);
  } catch (error) {
    if (!isTutorialsSchemaCompatError(error)) {
      throw error;
    }

    return fetchLegacyTutorialForEditor(supabase, tutorialRef, userId);
  }
}

export async function fetchTutorialComments(
  supabase: SupabaseLikeClient,
  tutorialId: string
): Promise<TutorialComment[]> {
  try {
    const { data, error } = await supabase
      .from("tutorial_comments")
      .select(
        "id, tutorial_id, user_id, parent_id, body, like_count, created_at, profiles!tutorial_comments_user_id_fkey(id, display_name, username, avatar_url)"
      )
      .eq("tutorial_id", tutorialId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return groupTutorialComments((data ?? []) as RawTutorialCommentRow[]);
  } catch (error) {
    if (!isTutorialsSchemaCompatError(error)) {
      throw error;
    }

    return [];
  }
}
