import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

const MAX_COLLABORATORS = 20;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-collabs-list", 60);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("workshop_collaborators")
    .select("id, user_id, role, created_at, profiles:user_id(display_name, username, avatar_url)")
    .eq("project_id", id);

  if (error) {
    console.error("[api] workshop collabs list error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  return NextResponse.json({ collaborators: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-collabs-add", 20);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  if (project.owner_id !== user.id) return NextResponse.json({ error: "Only the owner can manage collaborators" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawLookup = (body.username as string)?.trim();
  const role = body.role as string;

  if (!rawLookup) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  if (role !== "editor" && role !== "viewer") return NextResponse.json({ error: "Role must be 'editor' or 'viewer'" }, { status: 400 });

  const normalizedLookup = rawLookup.replace(/^@/, "").toLowerCase();

  const { data: targetUser } = await admin
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", normalizedLookup)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found. Use their exact @username." }, { status: 404 });
  }
  if (targetUser.id === user.id) {
    return NextResponse.json({ error: "Cannot add yourself as a collaborator" }, { status: 400 });
  }

  const { count } = await admin
    .from("workshop_collaborators")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  if ((count ?? 0) >= MAX_COLLABORATORS) {
    return NextResponse.json({ error: `Maximum ${MAX_COLLABORATORS} collaborators per project` }, { status: 400 });
  }

  const { data: collab, error } = await admin
    .from("workshop_collaborators")
    .insert({
      project_id: id,
      user_id: targetUser.id,
      role,
    })
    .select("id, user_id, role, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "User is already a collaborator" }, { status: 409 });
    }
    console.error("[api] workshop collab add error:", error);
    return NextResponse.json({ error: "Failed to add collaborator" }, { status: 500 });
  }

  return NextResponse.json(
    {
      collaborator: {
        ...collab,
        display_name: targetUser.display_name,
        username: targetUser.username,
      },
    },
    { status: 201 }
  );
}
