const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://localhost:7700";
const MEILI_KEY = process.env.MEILISEARCH_API_KEY || "";

export interface ProjectSearchDocument {
  id: string;
  title: string;
  hook: string | null;
  synopsis: string | null;
  creator_name: string;
  creator_id: string;
  genre: string | null;
  format: string | null;
  tone: string | null;
  lifecycle_status: string;
  preorder_price_cents: number | null;
  unlock_target: number | null;
  preorder_count_cache: number;
  teaser_thumbnail_url: string | null;
  slug: string | null;
  created_at: string | null;
}

export interface VideoSearchDocument {
  id: string;
  title: string;
  description: string | null;
  creator_name: string;
  creator_id: string;
  genre: string;
  tags: string[];
  content_type: string;
  media_type: string;
  thumbnail_url: string | null;
  is_premium: boolean;
  pricing_model: string;
  price_cents: number | null;
  preview_duration_seconds: number | null;
  view_count: number;
  published_at: string | null;
}

interface SearchResult<T> {
  hits: T[];
  estimatedTotalHits: number;
  query: string;
  processingTimeMs: number;
}

let videosIndexSetupPromise: Promise<void> | null = null;
let projectsIndexSetupPromise: Promise<void> | null = null;

function meiliHeaders() {
  return {
    ...(MEILI_KEY ? { Authorization: `Bearer ${MEILI_KEY}` } : {}),
    "Content-Type": "application/json",
  };
}

async function meiliFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${MEILI_HOST}${path}`, {
    ...init,
    headers: {
      ...meiliHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  return res;
}

export async function setupIndex(index = "videos"): Promise<void> {
  const createRes = await meiliFetch("/indexes", {
    method: "POST",
    body: JSON.stringify({ uid: index, primaryKey: "id" }),
  });

  if (!createRes.ok) {
    const createError = (await createRes.json().catch(() => null)) as
      | { code?: string; message?: string }
      | null;

    if (createError?.code !== "index_already_exists") {
      throw new Error(
        createError?.message ??
          `Meilisearch index setup failed with status ${createRes.status}`
      );
    }
  }

  const [filterableRes, searchableRes] = await Promise.all([
    meiliFetch(`/indexes/${encodeURIComponent(index)}/settings/filterable-attributes`, {
      method: "PUT",
      body: JSON.stringify([
        "genre",
        "content_type",
        "media_type",
        "creator_id",
        "is_premium",
      ]),
    }),
    meiliFetch(`/indexes/${encodeURIComponent(index)}/settings/searchable-attributes`, {
      method: "PUT",
      body: JSON.stringify(["title", "description", "creator_name", "tags"]),
    }),
  ]);

  if (!filterableRes.ok || !searchableRes.ok) {
    throw new Error("Meilisearch settings update failed");
  }
}

export async function ensureVideosIndex() {
  if (!videosIndexSetupPromise) {
    videosIndexSetupPromise = setupIndex("videos");
  }

  return videosIndexSetupPromise;
}

async function setupProjectsIndex(): Promise<void> {
  const index = "projects";

  const createRes = await meiliFetch("/indexes", {
    method: "POST",
    body: JSON.stringify({ uid: index, primaryKey: "id" }),
  });

  if (!createRes.ok) {
    const createError = (await createRes.json().catch(() => null)) as
      | { code?: string; message?: string }
      | null;

    if (createError?.code !== "index_already_exists") {
      throw new Error(
        createError?.message ??
          `Meilisearch projects index setup failed with status ${createRes.status}`
      );
    }
  }

  const [filterableRes, searchableRes, sortableRes] = await Promise.all([
    meiliFetch(`/indexes/${index}/settings/filterable-attributes`, {
      method: "PUT",
      body: JSON.stringify([
        "genre",
        "format",
        "tone",
        "lifecycle_status",
        "creator_id",
      ]),
    }),
    meiliFetch(`/indexes/${index}/settings/searchable-attributes`, {
      method: "PUT",
      body: JSON.stringify(["title", "hook", "synopsis", "creator_name"]),
    }),
    meiliFetch(`/indexes/${index}/settings/sortable-attributes`, {
      method: "PUT",
      body: JSON.stringify(["preorder_count_cache", "created_at"]),
    }),
  ]);

  if (!filterableRes.ok || !searchableRes.ok || !sortableRes.ok) {
    throw new Error("Meilisearch projects settings update failed");
  }
}

export async function ensureProjectsIndex() {
  if (!projectsIndexSetupPromise) {
    projectsIndexSetupPromise = setupProjectsIndex();
  }

  return projectsIndexSetupPromise;
}

export async function search<T>(
  index: string,
  query: string,
  options?: { filter?: string; limit?: number; offset?: number }
): Promise<SearchResult<T>> {
  const res = await meiliFetch(`/indexes/${encodeURIComponent(index)}/search`, {
    method: "POST",
    body: JSON.stringify({
      q: query,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
      filter: options?.filter,
    }),
  });

  if (!res.ok) throw new Error(`Meilisearch error: ${res.status}`);
  return res.json();
}

export async function indexDocument<T extends object>(index: string, document: T) {
  const res = await meiliFetch(`/indexes/${encodeURIComponent(index)}/documents`, {
    method: "POST",
    body: JSON.stringify([document]),
  });

  if (!res.ok) throw new Error(`Meilisearch indexing error: ${res.status}`);
  return res.json();
}

export async function deleteDocument(index: string, id: string) {
  const res = await meiliFetch(
    `/indexes/${encodeURIComponent(index)}/documents/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

  if (!res.ok) throw new Error(`Meilisearch delete error: ${res.status}`);
  return res.json();
}

/**
 * Index a project by ID — fetches from Supabase then indexes to Meilisearch.
 * Fire-and-forget safe: logs errors instead of throwing.
 */
export async function indexProjectById(projectId: string) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: project, error } = await admin
      .from("projects")
      .select(
        `id, title, hook, synopsis, genre, format, tone, lifecycle_status, moderation_status,
         preorder_price_cents, unlock_target, preorder_count_cache,
         teaser_thumbnail_url, slug, created_at, creator_id,
         profiles!projects_creator_id_fkey (display_name)`
      )
      .eq("id", projectId)
      .single();

    if (error || !project) {
      console.error("[meilisearch] project fetch error:", error);
      return;
    }

    // Only index live projects — remove from index if not live
    if (project.moderation_status !== "live") {
      await ensureProjectsIndex();
      try { await deleteDocument("projects", projectId); } catch { /* may not exist */ }
      return;
    }

    const rawProfiles = project.profiles as unknown;
    const profileData = Array.isArray(rawProfiles)
      ? (rawProfiles[0] as { display_name: string | null } | undefined)
      : (rawProfiles as { display_name: string | null } | null);

    const doc: ProjectSearchDocument = {
      id: project.id,
      title: project.title,
      hook: project.hook,
      synopsis: project.synopsis,
      creator_name: profileData?.display_name ?? "Unknown",
      creator_id: project.creator_id,
      genre: project.genre,
      format: project.format,
      tone: project.tone,
      lifecycle_status: project.lifecycle_status,
      preorder_price_cents: project.preorder_price_cents,
      unlock_target: project.unlock_target,
      preorder_count_cache: project.preorder_count_cache ?? 0,
      teaser_thumbnail_url: project.teaser_thumbnail_url,
      slug: project.slug,
      created_at: project.created_at,
    };

    await ensureProjectsIndex();
    await indexDocument("projects", doc);
  } catch (err) {
    console.error("[meilisearch] indexProjectById error:", err);
  }
}

/**
 * Remove a project from the Meilisearch index.
 * Fire-and-forget safe.
 */
export async function removeProjectFromIndex(projectId: string) {
  try {
    await ensureProjectsIndex();
    await deleteDocument("projects", projectId);
  } catch (err) {
    console.error("[meilisearch] removeProjectFromIndex error:", err);
  }
}
