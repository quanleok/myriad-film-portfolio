import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string; inviteId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-team-accept", 20);
    if (rateLimited) return rateLimited;

    const { id, inviteId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const admin = createAdminClient();
    const { data: invite } = await admin
      .from("project_collaborators")
      .select("id, project_id, user_id, invite_status")
      .eq("id", inviteId)
      .eq("project_id", id)
      .maybeSingle();

    if (!invite || invite.user_id !== user.id) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.invite_status !== "pending") {
      return NextResponse.json(
        { error: "Invite is no longer pending" },
        { status: 400 }
      );
    }

    // C3 fix: Add invite_status filter to prevent accepting a revoked invite
    const { data, error } = await admin
      .from("project_collaborators")
      .update({
        invite_status: "accepted",
        accepted_at: new Date().toISOString(),
        revoked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inviteId)
      .eq("invite_status", "pending")
      .select("id, project_id, role, can_view_earnings, invite_status")
      .single();

    if (error) {
      console.error("[api] project team accept error:", error);
      return NextResponse.json(
        { error: "Failed to accept invite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invite: data });
  } catch (err) {
    console.error("[api] project team accept handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
