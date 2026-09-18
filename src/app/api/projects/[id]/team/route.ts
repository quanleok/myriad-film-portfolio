import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import {
  MAX_PROJECT_COLLABORATORS,
  canManageProjectTeam,
  canReadPrivateProject,
  getProjectAccessContext,
  getProjectTeamMembers,
} from "@/lib/projects/team";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-team-list", 60);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await getProjectAccessContext(id, user.id);
    if (!canReadPrivateProject(access)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const collaborators = await getProjectTeamMembers(id);
    return NextResponse.json({
      collaborators,
      collaboratorCap: MAX_PROJECT_COLLABORATORS,
      canManage: canManageProjectTeam(access),
    });
  } catch (err) {
    console.error("[api] project team list error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-team-invite", 20);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
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

    const rawLookup = String(body.username ?? "").trim();
    const normalizedLookup = rawLookup.replace(/^@/, "").toLowerCase();
    const role = body.role === "editor" ? "editor" : body.role === "viewer" ? "viewer" : null;
    const canViewEarnings = body.can_view_earnings === true;

    if (!normalizedLookup) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: targetUser } = await admin
      .from("profiles")
      .select("id, display_name, username")
      .eq("username", normalizedLookup)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found. Use their exact @username." },
        { status: 404 }
      );
    }

    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: "Cannot add yourself as a collaborator" },
        { status: 400 }
      );
    }

    // Check if user already has an active invite
    const { data: existing } = await admin
      .from("project_collaborators")
      .select("id, invite_status, role")
      .eq("project_id", id)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existing && ["pending", "accepted"].includes(existing.invite_status)) {
      return NextResponse.json(
        { error: "User is already on this project team" },
        { status: 409 }
      );
    }

    // C2 fix: Use atomic RPC with row lock to prevent race condition on max collaborator count
    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "invite_project_collaborator",
      {
        p_project_id: id,
        p_user_id: targetUser.id,
        p_invited_by: user.id,
        p_role: role,
        p_can_view_earnings: canViewEarnings,
        p_max_collaborators: MAX_PROJECT_COLLABORATORS,
      }
    );

    if (rpcError) {
      if (rpcError.message?.includes("max_collaborators_reached")) {
        return NextResponse.json(
          { error: `Maximum ${MAX_PROJECT_COLLABORATORS} collaborators per project` },
          { status: 400 }
        );
      }
      console.error("[api] project team invite error:", rpcError);
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    const collaboratorId = rpcResult as string;
    const { data: collaborator, error } = await admin
      .from("project_collaborators")
      .select(
        "id, project_id, user_id, role, invite_status, can_view_earnings, created_at, accepted_at, revoked_at"
      )
      .eq("id", collaboratorId)
      .single();

    if (error || !collaborator) {
      console.error("[api] project team invite fetch error:", error);
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        collaborator: {
          ...collaborator,
          profiles: {
            display_name: targetUser.display_name,
            username: targetUser.username,
            avatar_url: null,
          },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api] project team invite handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
