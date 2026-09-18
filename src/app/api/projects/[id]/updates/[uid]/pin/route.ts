import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string; uid: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("update-pin", 10);
    if (rateLimited) return rateLimited;

    const { id, uid } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is project creator
    const adminSupabase = createAdminClient();
    const { data: project } = await adminSupabase
      .from("projects")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the project creator can pin updates" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const pinned = body.pinned === true;

    if (pinned) {
      // Unpin all others for this project first
      await adminSupabase
        .from("project_updates")
        .update({ is_pinned: false })
        .eq("project_id", id)
        .eq("is_pinned", true);
    }

    // Set pin state on this update
    const { data: updated, error } = await adminSupabase
      .from("project_updates")
      .update({ is_pinned: pinned })
      .eq("id", uid)
      .eq("project_id", id)
      .select("id, is_pinned")
      .single();

    if (error) {
      console.error("[api] pin update error:", error);
      return NextResponse.json({ error: "Failed to update pin" }, { status: 500 });
    }

    return NextResponse.json({ update: updated });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
