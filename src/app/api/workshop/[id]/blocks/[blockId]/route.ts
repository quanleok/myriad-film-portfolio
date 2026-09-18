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

// PATCH /api/workshop/[id]/blocks/[blockId] — update block content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-block-update", 60);
  if (rateLimited) return rateLimited;

  const { id, blockId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const admin = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.content !== undefined) updates.content = body.content;

  const { data: block, error } = await admin
    .from("workshop_blocks")
    .update(updates)
    .eq("id", blockId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    console.error("[api] workshop block update error:", error);
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }

  // Update project timestamp
  await admin
    .from("workshop_projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ block });
}

// DELETE /api/workshop/[id]/blocks/[blockId] — delete block
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-block-delete", 30);
  if (rateLimited) return rateLimited;

  const { id, blockId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const canEdit = await checkEditAccess(id, user.id);
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const { error } = await admin
    .from("workshop_blocks")
    .delete()
    .eq("id", blockId)
    .eq("project_id", id);

  if (error) {
    console.error("[api] workshop block delete error:", error);
    return NextResponse.json({ error: "Failed to delete block" }, { status: 500 });
  }

  // Update project timestamp
  await admin
    .from("workshop_projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
