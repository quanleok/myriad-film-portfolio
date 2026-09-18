import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/save — toggle save
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-save", 30);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const adminSupabase = createAdminClient();

    // Check if already saved
    const { data: existing } = await adminSupabase
      .from("project_saves")
      .select("id")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Unsave
      await adminSupabase
        .from("project_saves")
        .delete()
        .eq("id", existing.id);

      const { data: proj } = await adminSupabase
        .from("projects")
        .select("save_count_cache")
        .eq("id", id)
        .single();

      return NextResponse.json({ saved: false, count: proj?.save_count_cache ?? 0 });
    }

    // Save
    const { error } = await adminSupabase
      .from("project_saves")
      .insert({ project_id: id, user_id: user.id });

    if (error) {
      console.error("[api] save project error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    const { data: proj } = await adminSupabase
      .from("projects")
      .select("save_count_cache")
      .eq("id", id)
      .single();

    return NextResponse.json({ saved: true, count: proj?.save_count_cache ?? 0 });
  } catch (err) {
    console.error("[api] save project error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
