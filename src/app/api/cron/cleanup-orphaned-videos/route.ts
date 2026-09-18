import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteBunnyVideo } from "@/lib/bunny/upload";

const BUNNY_API_BASE = "https://video.bunnycdn.com/library";
const ORPHAN_GRACE_DAYS = 7;
const BUNNY_PAGE_SIZE = 100;

interface BunnyVideoRecord {
  guid?: string | null;
  Guid?: string | null;
  dateUploaded?: string | null;
  DateUploaded?: string | null;
  dateCreated?: string | null;
  DateCreated?: string | null;
  createdAt?: string | null;
  CreatedAt?: string | null;
}

interface BunnyListResponse {
  items?: BunnyVideoRecord[];
  Items?: BunnyVideoRecord[];
  totalItems?: number;
  TotalItems?: number;
  itemsPerPage?: number;
  ItemsPerPage?: number;
}

function verifyCronAuth(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const authHeader = request.headers.get("authorization");
  const xCronHeader = request.headers.get("x-cron-secret");
  const cronHeader =
    request.headers.get("cron-secret") ??
    request.headers.get("CRON_SECRET");

  return (
    authHeader === `Bearer ${expected}` ||
    xCronHeader === expected ||
    cronHeader === expected
  );
}

function getCutoffDate(): Date {
  return new Date(Date.now() - ORPHAN_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

function getBunnyGuid(video: BunnyVideoRecord): string | null {
  const guid = video.guid ?? video.Guid ?? null;
  return typeof guid === "string" && guid.trim().length > 0 ? guid : null;
}

function getBunnyUploadedAt(video: BunnyVideoRecord): Date | null {
  const raw =
    video.dateUploaded ??
    video.DateUploaded ??
    video.dateCreated ??
    video.DateCreated ??
    video.createdAt ??
    video.CreatedAt ??
    null;

  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function listAllBunnyVideos(): Promise<BunnyVideoRecord[]> {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;

  if (!libraryId || !apiKey) {
    throw new Error("Missing Bunny stream credentials");
  }

  const videos: BunnyVideoRecord[] = [];
  let page = 1;

  while (page <= 50) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        `${BUNNY_API_BASE}/${libraryId}/videos?page=${page}&itemsPerPage=${BUNNY_PAGE_SIZE}`,
        {
          method: "GET",
          headers: { AccessKey: apiKey },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Bunny list error: ${response.status}`);
      }

      const payload = (await response.json()) as BunnyListResponse;
      const pageItems = payload.items ?? payload.Items ?? [];
      const totalItems = payload.totalItems ?? payload.TotalItems ?? pageItems.length;
      const itemsPerPage = payload.itemsPerPage ?? payload.ItemsPerPage ?? BUNNY_PAGE_SIZE;

      videos.push(...pageItems);

      if (
        pageItems.length === 0 ||
        pageItems.length < itemsPerPage ||
        videos.length >= totalItems
      ) {
        break;
      }

      page += 1;
    } finally {
      clearTimeout(timeout);
    }
  }

  return videos;
}

async function getReferencedBunnyIds() {
  const admin = createAdminClient();

  const [
    showcasePosts,
    videos,
    projects,
    characterCards,
    conceptCards,
    updates,
    extras,
  ] = await Promise.all([
    admin.from("showcase_posts").select("bunny_video_id"),
    admin.from("videos").select("bunny_video_id"),
    admin.from("projects").select("teaser_asset_id"),
    admin.from("project_character_cards").select("media_asset_id"),
    admin.from("project_concept_cards").select("media_asset_id"),
    admin.from("project_updates").select("media_asset_id"),
    admin.from("project_extras").select("media_asset_id"),
  ]);

  const results = [
    showcasePosts,
    videos,
    projects,
    characterCards,
    conceptCards,
    updates,
    extras,
  ];

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const ids = new Set<string>();
  const collect = (
    rows: Array<Record<string, string | null>> | null | undefined,
    key: string
  ) => {
    for (const row of rows ?? []) {
      const value = row[key];
      if (typeof value === "string" && value.trim().length > 0) {
        ids.add(value);
      }
    }
  };

  collect(showcasePosts.data as Array<Record<string, string | null>> | null, "bunny_video_id");
  collect(videos.data as Array<Record<string, string | null>> | null, "bunny_video_id");
  collect(projects.data as Array<Record<string, string | null>> | null, "teaser_asset_id");
  collect(characterCards.data as Array<Record<string, string | null>> | null, "media_asset_id");
  collect(conceptCards.data as Array<Record<string, string | null>> | null, "media_asset_id");
  collect(updates.data as Array<Record<string, string | null>> | null, "media_asset_id");
  collect(extras.data as Array<Record<string, string | null>> | null, "media_asset_id");

  return ids;
}

async function cleanupSoftDeletedShowcasePosts(cutoffIso: string) {
  const admin = createAdminClient();
  const deletedVideoIds = new Set<string>();
  const deletedPostIds: string[] = [];
  const errors: Array<{ postId: string; bunnyVideoId: string; error: string }> = [];

  const { data: expiredPosts, error } = await admin
    .from("showcase_posts")
    .select("id, bunny_video_id, deleted_at")
    .not("deleted_at", "is", null)
    .lte("deleted_at", cutoffIso);

  if (error) {
    throw new Error(error.message);
  }

  for (const post of expiredPosts ?? []) {
    const bunnyVideoId =
      typeof post.bunny_video_id === "string" && post.bunny_video_id.trim().length > 0
        ? post.bunny_video_id
        : null;

    if (!bunnyVideoId) continue;

    try {
      await deleteBunnyVideo(bunnyVideoId);
      deletedVideoIds.add(bunnyVideoId);
      deletedPostIds.push(post.id);
    } catch (err) {
      errors.push({
        postId: post.id,
        bunnyVideoId,
        error: err instanceof Error ? err.message : "Unknown delete error",
      });
    }
  }

  if (deletedPostIds.length > 0) {
    const { error: deleteRowsError } = await admin
      .from("showcase_posts")
      .delete()
      .in("id", deletedPostIds);

    if (deleteRowsError) {
      throw new Error(deleteRowsError.message);
    }
  }

  return {
    candidates: expiredPosts?.length ?? 0,
    deletedPostIds,
    deletedVideoIds,
    errors,
  };
}

async function cleanupUnreferencedBunnyVideos(
  cutoffDate: Date,
  protectedIds: Set<string>
) {
  const deletedVideoIds: string[] = [];
  const errors: Array<{ bunnyVideoId: string; error: string }> = [];
  const referencedIds = await getReferencedBunnyIds();
  const allProtectedIds = new Set([...referencedIds, ...protectedIds]);

  const bunnyVideos = await listAllBunnyVideos();

  for (const video of bunnyVideos) {
    const guid = getBunnyGuid(video);
    const uploadedAt = getBunnyUploadedAt(video);

    if (!guid || !uploadedAt) continue;
    if (uploadedAt > cutoffDate) continue;
    if (allProtectedIds.has(guid)) continue;

    try {
      await deleteBunnyVideo(guid);
      deletedVideoIds.push(guid);
    } catch (err) {
      errors.push({
        bunnyVideoId: guid,
        error: err instanceof Error ? err.message : "Unknown delete error",
      });
    }
  }

  return {
    scanned: bunnyVideos.length,
    deletedVideoIds,
    errors,
  };
}

async function handleCleanup(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoffDate = getCutoffDate();
    const cutoffIso = cutoffDate.toISOString();

    const softDeleted = await cleanupSoftDeletedShowcasePosts(cutoffIso);
    const unreferenced = await cleanupUnreferencedBunnyVideos(
      cutoffDate,
      softDeleted.deletedVideoIds
    );

    return NextResponse.json({
      ok: true,
      cutoffIso,
      deletedSoftDeletedPosts: softDeleted.deletedPostIds.length,
      deletedSoftDeletedVideoIds: Array.from(softDeleted.deletedVideoIds),
      deletedUnreferencedVideoIds: unreferenced.deletedVideoIds,
      scannedBunnyVideos: unreferenced.scanned,
      errors: [...softDeleted.errors, ...unreferenced.errors],
    });
  } catch (err) {
    console.error("[cron] cleanup-orphaned-videos error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}
