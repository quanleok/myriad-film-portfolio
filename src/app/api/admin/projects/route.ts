import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logFailedAuth } from "@/lib/auth-checks";

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-projects", 30);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/admin/projects", "GET");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") ?? "live";

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();
    let query = adminSupabase
      .from("projects")
      .select(
        `id, title, slug, genre, moderation_status, lifecycle_status,
         preorder_price_cents, unlock_target, preorder_count_cache,
         campaign_starts_at, created_at, updated_at, creator_id`
      );

    if (filter !== "all") {
      query = query.eq("moderation_status", filter);
    }

    // FIFO for pending_review (oldest first), newest launches first for live, newest update for rest
    if (filter === "pending_review") {
      query = query.order("created_at", { ascending: true }).limit(100);
    } else if (filter === "live") {
      query = query.order("campaign_starts_at", { ascending: false, nullsFirst: false }).limit(100);
    } else {
      query = query.order("updated_at", { ascending: false }).limit(100);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      console.error("[api] admin projects query error:", queryError);
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 }
      );
    }

    // Fetch creator info for all unique creator IDs
    const creatorIds = [
      ...new Set((data ?? []).map((p) => p.creator_id).filter(Boolean)),
    ];

    let creatorMap: Record<string, { display_name: string; username: string }> =
      {};

    if (creatorIds.length > 0) {
      const { data: creators } = await adminSupabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", creatorIds);

      if (creators) {
        for (const c of creators) {
          creatorMap[c.id] = {
            display_name: c.display_name ?? "Unknown",
            username: c.username ?? "",
          };
        }
      }
    }

    const projects = (data ?? []).map((p) => ({
      ...p,
      creator_name: creatorMap[p.creator_id]?.display_name ?? "Unknown",
      creator_username: creatorMap[p.creator_id]?.username ?? "",
    }));

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[api] admin projects handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
