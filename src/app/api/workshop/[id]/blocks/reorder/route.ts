import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

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

// PATCH /api/workshop/[id]/blocks/reorder — reorder blocks
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-blocks-reorder", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const canEdit = await checkEditAccess(id, user.id);
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { block_ids: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.block_ids)) {
    return NextResponse.json({ error: "block_ids must be an array" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update sort_order for each block
  const updates = body.block_ids.map((blockId, index) =>
    admin
      .from("workshop_blocks")
      .update({ sort_order: index })
      .eq("id", blockId)
      .eq("project_id", id)
  );

  await Promise.all(updates);

  // Update project timestamp
  await admin
    .from("workshop_projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
