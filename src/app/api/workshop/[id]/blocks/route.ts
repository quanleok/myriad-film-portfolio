import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

const VALID_BLOCK_TYPES = ["script", "character", "scene", "note"];
const MAX_BLOCKS = 100;

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

// GET /api/workshop/[id]/blocks — list blocks
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-blocks-list", 60);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: blocks, error } = await admin
    .from("workshop_blocks")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[api] workshop blocks list error:", error);
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 });
  }

  return NextResponse.json({ blocks: blocks ?? [] });
}

// POST /api/workshop/[id]/blocks — add block
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-blocks-create", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const canEdit = await checkEditAccess(id, user.id);
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check block limit
  const admin = createAdminClient();
  const { count } = await admin
    .from("workshop_blocks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  if ((count ?? 0) >= MAX_BLOCKS) {
    return NextResponse.json({ error: `Maximum ${MAX_BLOCKS} blocks per project` }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const blockType = body.block_type as string;
  if (!VALID_BLOCK_TYPES.includes(blockType)) {
    return NextResponse.json({ error: "Invalid block type" }, { status: 400 });
  }

  // Default content per type
  const defaultContent: Record<string, object> = {
    script: {
      logline: "",
      synopsis: "",
      concept_notes: "",
      world_notes: "",
      screenplay_text: "",
      acts: [
        { id: "act-1", label: "Act I" },
        { id: "act-2", label: "Act II" },
        { id: "act-3", label: "Act III" },
      ],
    },
    character: {
      name: "",
      description: "",
      role: "other",
      look_notes: "",
      cover_asset_id: null,
      angles: {},
      extra_media: [],
      linked_scene_ids: [],
      linked_asset_ids: [],
    },
    scene: {
      title: "",
      description: "",
      status: "draft",
      act_id: null,
      script_excerpt: "",
      linked_character_ids: [],
      linked_asset_ids: [],
      linked_video_asset_ids: [],
      scene_order: 0,
    },
    note: { text: "" },
  };

  const content = (body.content as object) ?? defaultContent[blockType];

  // Get max sort_order
  const { data: lastBlock } = await admin
    .from("workshop_blocks")
    .select("sort_order")
    .eq("project_id", id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (lastBlock?.sort_order ?? -1) + 1;

  const { data: block, error } = await admin
    .from("workshop_blocks")
    .insert({
      project_id: id,
      block_type: blockType,
      sort_order: sortOrder,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error("[api] workshop block create error:", error);
    return NextResponse.json({ error: "Failed to create block" }, { status: 500 });
  }

  // Update project timestamp
  await admin
    .from("workshop_projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ block }, { status: 201 });
}
