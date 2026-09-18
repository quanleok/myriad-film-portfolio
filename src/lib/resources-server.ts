import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  filterAndSortResources,
  getSeededResourceById,
  getSeededResourcesIfNeeded,
  parseResourceSort,
  type ResourceCommentRecord,
  type ResourceCreatorSummary,
  type ResourceDetail,
  type ResourceFileRecord,
  type ResourceSort,
  type ResourceSummary,
  type ResourceCategory,
  type ResourceQuickFilter,
} from "@/lib/resources";

type ResourceRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  tags: string[] | null;
  thumbnail_url: string | null;
  download_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  is_featured: boolean | null;
  is_published: boolean | null;
  license: "free" | "attribution" | "premium";
  created_at: string;
  updated_at: string;
};

function buildCreatorMap(
  rows: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  }>
) {
  return new Map<string, ResourceCreatorSummary>(
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
  if (!userIds.length) return new Map<string, ResourceCreatorSummary>();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  if (error) {
    console.error("[resources] fetch creators error:", error);
    return new Map<string, ResourceCreatorSummary>();
  }

  return buildCreatorMap(data ?? []);
}

function hydrateResourceSummary(
  row: ResourceRow,
  creators: Map<string, ResourceCreatorSummary>
): ResourceSummary {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    tags: row.tags ?? [],
    thumbnail_url: row.thumbnail_url,
    download_count: row.download_count ?? 0,
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    is_featured: row.is_featured ?? false,
    is_published: row.is_published ?? true,
    license: row.license,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creator: creators.get(row.user_id) ?? null,
  };
}

export async function fetchResourceSummaries() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("resources")
    .select(
      "id, user_id, title, description, category, tags, thumbnail_url, download_count, like_count, comment_count, is_featured, is_published, license, created_at, updated_at"
    )
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("download_count", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[resources] fetch summaries error:", error);
    return getSeededResourcesIfNeeded([]);
  }

  const creators = await fetchCreators([...(new Set((data ?? []).map((row) => row.user_id)))]);
  const resources = (data ?? []).map((row) => hydrateResourceSummary(row as ResourceRow, creators));
  return getSeededResourcesIfNeeded(resources);
}

export async function fetchFilteredResources({
  query,
  category,
  tag,
  sort,
  quickFilter,
}: {
  query: string;
  category: ResourceCategory | "all";
  tag: string | null;
  sort: ResourceSort;
  quickFilter: ResourceQuickFilter | null;
}) {
  const resources = await fetchResourceSummaries();
  return filterAndSortResources({
    resources,
    query,
    category,
    tag,
    sort,
    quickFilter,
  });
}

export async function fetchResourceDetail(id: string): Promise<ResourceDetail | null> {
  const sample = getSeededResourceById(id);
  if (sample) return sample;

  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: resource, error } = await admin
    .from("resources")
    .select(
      "id, user_id, title, description, category, tags, thumbnail_url, download_count, like_count, comment_count, is_featured, is_published, license, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !resource || !resource.is_published) {
    if (error && error.code !== "PGRST116") {
      console.error("[resources] fetch detail error:", error);
    }
    return null;
  }

  const creators = await fetchCreators([resource.user_id]);
  const base = hydrateResourceSummary(resource as ResourceRow, creators);

  const [{ data: files }, { data: comments }, { data: likes }] = await Promise.all([
    admin
      .from("resource_files")
      .select("id, resource_id, file_url, file_name, file_type, file_size_bytes, sort_order, created_at")
      .eq("resource_id", id)
      .order("sort_order", { ascending: true }),
    admin
      .from("resource_comments")
      .select("id, resource_id, user_id, body, created_at")
      .eq("resource_id", id)
      .order("created_at", { ascending: false }),
    user
      ? admin.from("resource_likes").select("id").eq("resource_id", id).eq("user_id", user.id).limit(1)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
  ]);

  const commentUserIds = [...new Set((comments ?? []).map((comment) => comment.user_id))];
  const commentCreators = await fetchCreators(commentUserIds);

  return {
    ...base,
    files: (files ?? []) as ResourceFileRecord[],
    comments: ((comments ?? []) as Array<{
      id: string;
      resource_id: string;
      user_id: string;
      body: string;
      created_at: string;
    }>).map(
      (comment): ResourceCommentRecord => ({
        ...comment,
        creator: commentCreators.get(comment.user_id) ?? null,
      })
    ),
    likedByViewer: Array.isArray(likes) && likes.length > 0,
  };
}

export function normalizeResourceSort(value?: string | null) {
  return parseResourceSort(value);
}
