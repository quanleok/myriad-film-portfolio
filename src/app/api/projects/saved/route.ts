import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/projects/saved — list saved projects for current user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: saves, error } = await adminSupabase
      .from("project_saves")
      .select(`
        id,
        project_id,
        created_at,
        projects:project_id (
          id,
          title,
          slug,
          hook,
          teaser_thumbnail_url,
          lifecycle_status,
          preorder_count_cache,
          unlock_target,
          preorder_price_cents,
          release_price_cents,
          genre,
          format
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api] fetch saved projects error:", error);
      return NextResponse.json({ error: "Failed to fetch saved projects" }, { status: 500 });
    }

    const projects = (saves ?? [])
      .filter((s: Record<string, unknown>) => s.projects)
      .map((s: Record<string, unknown>) => ({
        ...(s.projects as Record<string, unknown>),
        saved_at: s.created_at,
      }));

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[api] saved projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
