import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { removeProjectFromIndex } from "@/lib/meilisearch/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-reject", 10);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse optional reason
    let reason = "Rejected by admin";
    try {
      const body = await request.json();
      if (body.reason && typeof body.reason === "string") {
        reason = body.reason.trim().slice(0, 500);
      }
    } catch {
      // No body or invalid JSON — use default reason
    }

    // Fetch the project
    const adminSupabase = createAdminClient();
    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, moderation_status, lifecycle_status")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.moderation_status !== "pending_review") {
      return NextResponse.json(
        { error: "Only projects pending review can be rejected" },
        { status: 400 }
      );
    }

    // Update project
    const { data: updated, error: updateError } = await adminSupabase
      .from("projects")
      .update({ moderation_status: "rejected" })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[api] project reject error:", updateError);
      return NextResponse.json(
        { error: "Failed to reject project" },
        { status: 500 }
      );
    }

    // Insert status history
    const { error: historyError } = await adminSupabase
      .from("project_status_history")
      .insert({
        project_id: id,
        from_status: project.moderation_status,
        to_status: "rejected",
        reason,
        actor_user_id: user.id,
      });

    if (historyError) {
      console.error("[api] status history insert error:", historyError);
    }

    // Remove from Meilisearch (rejected projects not searchable)
    removeProjectFromIndex(id);

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
