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

const VALID_STATUSES: WorkshopAssetStatus[] = ["rough", "candidate", "approved", "final"];
const VALID_CATEGORIES = WORKSHOP_ASSET_CATEGORIES.map((item) => item.value);

async function checkEditAccess(projectId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("workshop_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (!project) return false;
  if (project.owner_id === userId) return true;

  const { data: collab } = await admin
    .from("workshop_collaborators")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  return collab?.role === "editor";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-assets-update", 30);
  if (rateLimited) return rateLimited;

  const { id, assetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const canEdit = await checkEditAccess(id, user.id);
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.caption === "string" || body.caption === null) updates.caption = body.caption;
  if (typeof body.url === "string") updates.url = body.url;
  if (typeof body.asset_id === "string" || body.asset_id === null) updates.asset_id = body.asset_id;
  if (typeof body.storage_kind === "string") updates.storage_kind = body.storage_kind;
  if (typeof body.status === "string") {
    if (!VALID_STATUSES.includes(body.status as WorkshopAssetStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (typeof body.asset_category === "string") {
    if (!VALID_CATEGORIES.includes(body.asset_category as WorkshopAssetCategory)) {
      return NextResponse.json({ error: "Invalid asset_category" }, { status: 400 });
    }
    updates.asset_category = body.asset_category;
  }
  if (Array.isArray(body.tags)) updates.tags = body.tags;
  if (Array.isArray(body.linked_scene_ids)) updates.linked_scene_ids = body.linked_scene_ids;
  if (Array.isArray(body.linked_character_ids)) updates.linked_character_ids = body.linked_character_ids;
  if (body.generation_meta && typeof body.generation_meta === "object") {
    updates.generation_meta = body.generation_meta;
  }
  if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;

  const admin = createAdminClient();
  const { data: asset, error } = await admin
    .from("workshop_assets")
    .update(updates)
    .eq("id", assetId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    console.error("[api] workshop asset update error:", error);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }

  return NextResponse.json({ asset });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-assets-delete", 20);
  if (rateLimited) return rateLimited;

  const { id, assetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const canEdit = await checkEditAccess(id, user.id);
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("workshop_assets")
    .delete()
    .eq("id", assetId)
    .eq("project_id", id);

  if (error) {
    console.error("[api] workshop asset delete error:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
