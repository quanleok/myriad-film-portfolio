import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import {
  WORKSHOP_ASSET_CATEGORIES,
  type WorkshopAssetCategory,
  type WorkshopAssetStatus,
} from "@/lib/workshop";

const VALID_MEDIA_TYPES = ["image", "video"] as const;
const VALID_STORAGE_KINDS = ["supabase_image", "bunny_video", "external_url"] as const;
const VALID_STATUSES: WorkshopAssetStatus[] = ["rough", "candidate", "approved", "final"];
const VALID_CATEGORIES = WORKSHOP_ASSET_CATEGORIES.map((item) => item.value);

async function checkProjectAccess(projectId: string, userId: string | null): Promise<"owner" | "editor" | "viewer" | null> {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("workshop_projects")
    .select("owner_id, visibility")
    .eq("id", projectId)
    .single();

  if (!project) return null;
  if (userId && project.owner_id === userId) return "owner";

  if (userId) {
    const { data: collab } = await admin
      .from("workshop_collaborators")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single();
    if (collab) return collab.role as "editor" | "viewer";
  }

  if (project.visibility === "public") return "viewer";
  return null;
}

function parseStringArray(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-assets-list", 60);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = await checkProjectAccess(id, user?.id ?? null);
  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const mediaType = request.nextUrl.searchParams.get("media_type");
  const assetCategory = request.nextUrl.searchParams.get("asset_category");
  const status = request.nextUrl.searchParams.get("status");
  const linkedSceneId = request.nextUrl.searchParams.get("linked_scene_id");
  const linkedCharacterId = request.nextUrl.searchParams.get("linked_character_id");
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const admin = createAdminClient();
  let query = admin
    .from("workshop_assets")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (mediaType && VALID_MEDIA_TYPES.includes(mediaType as (typeof VALID_MEDIA_TYPES)[number])) {
    query = query.eq("media_type", mediaType);
  }
  if (assetCategory && VALID_CATEGORIES.includes(assetCategory as WorkshopAssetCategory)) {
    query = query.eq("asset_category", assetCategory);
  }
  if (status && VALID_STATUSES.includes(status as WorkshopAssetStatus)) {
    query = query.eq("status", status);
  }
  if (linkedSceneId) {
    query = query.contains("linked_scene_ids", [linkedSceneId]);
  }
  if (linkedCharacterId) {
    query = query.contains("linked_character_ids", [linkedCharacterId]);
  }
  if (q) {
    query = query.or(`title.ilike.%${q}%,caption.ilike.%${q}%`);
  }

  const { data: assets, error } = await query;

  if (error) {
    console.error("[api] workshop assets list error:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }

  return NextResponse.json({ assets: assets ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-assets-create", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const access = await checkProjectAccess(id, user.id);
  if (access !== "owner" && access !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mediaType = body.media_type as string;
  if (!VALID_MEDIA_TYPES.includes(mediaType as (typeof VALID_MEDIA_TYPES)[number])) {
    return NextResponse.json({ error: "media_type must be image or video" }, { status: 400 });
  }

  const storageKind = (body.storage_kind as string) ?? (mediaType === "video" ? "bunny_video" : "supabase_image");
  if (!VALID_STORAGE_KINDS.includes(storageKind as (typeof VALID_STORAGE_KINDS)[number])) {
    return NextResponse.json({ error: "Invalid storage_kind" }, { status: 400 });
  }

  const status = (body.status as string) ?? "rough";
  if (!VALID_STATUSES.includes(status as WorkshopAssetStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const assetCategory = (body.asset_category as string) ?? (mediaType === "video" ? "generated_video" : "mixed");
  if (!VALID_CATEGORIES.includes(assetCategory as WorkshopAssetCategory)) {
    return NextResponse.json({ error: "Invalid asset_category" }, { status: 400 });
  }

  const linkedSceneIds = Array.isArray(body.linked_scene_ids)
    ? body.linked_scene_ids.filter((value): value is string => typeof value === "string")
    : parseStringArray(body.linked_scene_ids as string | null);
  const linkedCharacterIds = Array.isArray(body.linked_character_ids)
    ? body.linked_character_ids.filter((value): value is string => typeof value === "string")
    : parseStringArray(body.linked_character_ids as string | null);

  const admin = createAdminClient();
  const { data: lastAsset } = await admin
    .from("workshop_assets")
    .select("sort_order")
    .eq("project_id", id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: asset, error } = await admin
    .from("workshop_assets")
    .insert({
      project_id: id,
      owner_id: user.id,
      title: ((body.title as string) ?? "").trim(),
      caption: (body.caption as string) ?? null,
      media_type: mediaType,
      storage_kind: storageKind,
      url: (body.url as string) ?? null,
      asset_id: (body.asset_id as string) ?? null,
      status,
      tags: Array.isArray(body.tags) ? body.tags : [],
      asset_category: assetCategory,
      linked_scene_ids: linkedSceneIds,
      linked_character_ids: linkedCharacterIds,
      generation_meta:
        body.generation_meta && typeof body.generation_meta === "object"
          ? body.generation_meta
          : {},
      sort_order: typeof body.sort_order === "number" ? body.sort_order : (lastAsset?.sort_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("[api] workshop asset create error:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }

  return NextResponse.json({ asset }, { status: 201 });
}
