import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("project-feed", 60);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const cursor = Math.max(0, parseInt(searchParams.get("cursor") ?? "0", 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const status = searchParams.get("status");

    let query = supabase
      .from("projects")
      .select(
        `id, slug, title, hook, genre, format, tone, runtime_minutes, episode_count,
         synopsis, inspiration_line, premiere_date,
         campaign_ends_at, delivery_deadline, production_window_days, is_overdue,
         teaser_asset_id, teaser_thumbnail_url,
         preorder_price_cents, release_price_cents, unlock_target, preorder_count_cache,
         purchase_count_cache, update_count_cache, save_count_cache, production_progress,
         like_count_cache, discussion_count_cache, interest_count_cache, lifecycle_status, launch_mode, content_rating, is_test, created_at,
         profiles!projects_creator_id_fkey (display_name, username, avatar_url),
         creator:profiles!projects_creator_id_fkey (display_name, username, avatar_url, bio, follower_count, delivery_record_summary),
         character_cards:project_character_cards (id, name, short_description, media_asset_id, media_type, sort_order),
         concept_cards:project_concept_cards (id, caption, media_asset_id, media_type, sort_order)`
      )
      .eq("moderation_status", "live")
      .eq("visibility", "public")
      .neq("is_test", true)
      .order("created_at", { ascending: false })
      .range(cursor, cursor + limit);

    if (status) {
      query = query.eq("lifecycle_status", status);
    } else {
      // Exclude terminal statuses from default feed
      query = query.not("lifecycle_status", "in", "(failed_to_unlock,cancelled)");
    }

    const { data: projects, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const hasMore = (projects?.length ?? 0) > limit;
    const trimmed = hasMore ? projects!.slice(0, limit) : (projects ?? []);
    const nextCursor = hasMore ? cursor + limit : null;

    // Compute preorders_today for each project
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const projectIds = trimmed.map((p: { id: string }) => p.id);
    let preordersTodayMap: Record<string, number> = {};

    if (projectIds.length > 0) {
      const { data: recentPreorders } = await supabase
        .from("project_preorders")
        .select("project_id")
        .in("project_id", projectIds)
        .gte("created_at", dayAgo)
        .eq("current_status", "active");

      for (const row of recentPreorders ?? []) {
        preordersTodayMap[row.project_id] = (preordersTodayMap[row.project_id] ?? 0) + 1;
      }
    }

    const enriched = trimmed.map((p: Record<string, unknown>) => ({
      ...p,
      preorders_today: preordersTodayMap[p.id as string] ?? 0,
    }));

    return NextResponse.json({
      projects: enriched,
      hasMore,
      nextCursor,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
