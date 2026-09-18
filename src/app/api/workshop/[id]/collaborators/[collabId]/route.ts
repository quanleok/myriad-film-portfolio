import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

// PATCH /api/workshop/[id]/collaborators/[collabId] — change role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collabId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-collab-update", 20);
  if (rateLimited) return rateLimited;

  const { id, collabId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("workshop_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role as string;
  if (role !== "editor" && role !== "viewer") return NextResponse.json({ error: "Role must be 'editor' or 'viewer'" }, { status: 400 });

  const { data: collab, error } = await admin
    .from("workshop_collaborators")
    .update({ role })
    .eq("id", collabId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    console.error("[api] workshop collab update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ collaborator: collab });
}

// DELETE /api/workshop/[id]/collaborators/[collabId] — remove collaborator
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; collabId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-collab-remove", 20);
  if (rateLimited) return rateLimited;

  const { id, collabId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("workshop_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await admin
    .from("workshop_collaborators")
    .delete()
    .eq("id", collabId)
    .eq("project_id", id);

  if (error) {
    console.error("[api] workshop collab remove error:", error);
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
