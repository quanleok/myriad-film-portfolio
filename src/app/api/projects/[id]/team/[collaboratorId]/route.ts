import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import {
  canManageProjectTeam,
  getProjectAccessContext,
} from "@/lib/projects/team";

interface RouteContext {
  params: Promise<{ id: string; collaboratorId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-team-update", 20);
    if (rateLimited) return rateLimited;

    const { id, collaboratorId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const access = await getProjectAccessContext(id, user.id);
    if (!canManageProjectTeam(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const role =
      body.role === "editor" ? "editor" : body.role === "viewer" ? "viewer" : null;
    const canViewEarnings = body.can_view_earnings === true;

    if (!role) {
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: collaborator, error } = await admin
      .from("project_collaborators")
      .update({
        role,
        can_view_earnings: canViewEarnings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collaboratorId)
      .eq("project_id", id)
      .neq("role", "owner")
      .select(
        "id, project_id, user_id, role, invite_status, can_view_earnings, created_at, accepted_at, revoked_at, profiles:user_id(display_name, username, avatar_url)"
      )
      .single();

    if (error) {
      console.error("[api] project team update error:", error);
      return NextResponse.json(
        { error: "Failed to update collaborator" },
        { status: 500 }
      );
    }

    if (!collaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ collaborator });
  } catch (err) {
    console.error("[api] project team update handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-team-remove", 20);
    if (rateLimited) return rateLimited;

    const { id, collaboratorId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const access = await getProjectAccessContext(id, user.id);
    if (!canManageProjectTeam(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("project_collaborators")
      .update({
        invite_status: "revoked",
        can_view_earnings: false,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", collaboratorId)
      .eq("project_id", id)
      .neq("role", "owner");

    if (error) {
      console.error("[api] project team remove error:", error);
      return NextResponse.json(
        { error: "Failed to remove collaborator" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] project team remove handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
