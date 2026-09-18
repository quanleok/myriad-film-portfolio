import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

// GET /api/workshop/[id] — get single project with blocks + collaborators
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-detail", 60);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: project, error } = await admin
    .from("workshop_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check access
  const shareToken = request.nextUrl.searchParams.get("token");
  const isOwner = user?.id === project.owner_id;

  let userRole: "owner" | "editor" | "viewer" | null = null;

  if (isOwner) {
    userRole = "owner";
  } else if (user) {
    const { data: collab } = await admin
      .from("workshop_collaborators")
      .select("role")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .single();
    if (collab) userRole = collab.role as "editor" | "viewer";
  }

  const hasAccess =
    project.visibility === "public" ||
    userRole !== null ||
    (shareToken && project.share_token === shareToken);

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Fetch blocks
  const { data: blocks } = await admin
    .from("workshop_blocks")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  // Fetch collaborators with display names
  const { data: collaborators } = await admin
    .from("workshop_collaborators")
    .select("id, user_id, role, created_at, profiles:user_id(display_name, username, avatar_url)")
    .eq("project_id", id);

  // Fetch owner profile
  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", project.owner_id)
    .single();

  // Fetch assets
  const { data: assets } = await admin
    .from("workshop_assets")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Determine canEdit based on role
  const canEdit = userRole === "owner" || userRole === "editor";
  const isShareLink = !userRole && shareToken === project.share_token;

  return NextResponse.json({
    project,
    blocks: blocks ?? [],
    assets: assets ?? [],
    collaborators: collaborators ?? [],
    ownerProfile,
    userRole: isShareLink ? "share_viewer" : (userRole ?? "public_viewer"),
    canEdit,
  });
}

// PATCH /api/workshop/[id] — update project (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-update", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  // Verify ownership
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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 2 || t.length > 200) return NextResponse.json({ error: "Title must be 2-200 characters" }, { status: 400 });
    updates.title = t;
  }
  if (typeof body.description === "string") updates.description = body.description.trim().slice(0, 1000);
  if (body.visibility === "public" || body.visibility === "private") updates.visibility = body.visibility;
  if (typeof body.cover_image_url === "string" || body.cover_image_url === null) updates.cover_image_url = body.cover_image_url;
  if (typeof body.allow_share_downloads === "boolean") updates.allow_share_downloads = body.allow_share_downloads;

  const { data: updated, error: updateError } = await admin
    .from("workshop_projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[api] workshop update error:", updateError);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ project: updated });
}

// DELETE /api/workshop/[id] — delete project (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-delete", 10);
  if (rateLimited) return rateLimited;

  const { id } = await params;
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

  const { error: deleteError } = await admin
    .from("workshop_projects")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[api] workshop delete error:", deleteError);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
