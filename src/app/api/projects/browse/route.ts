import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureProjectsIndex, search as meiliSearch, type ProjectSearchDocument } from "@/lib/meilisearch/client";

const LIFECYCLE_STATUS_PRIORITY: Record<string, number> = {
  premiering: 0,
  released: 1,
  in_production: 2,
  unlocking: 3,
  teaser: 4,
  failed_to_unlock: 5,
  cancelled: 6,
};

function parseStatusFilter(status: string | null): string[] | null {
  if (!status || status === "all") return null;
  if (status === "watchable") return ["premiering", "released"];
  if (status === "back_early") return ["unlocking", "in_production"];

  const values = status
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : null;
}

function parseDateValue(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("project-browse", 60);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const cursor = Math.max(0, parseInt(searchParams.get("cursor") ?? "0", 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const search = searchParams.get("search");
    const genre = searchParams.get("genre");
    const format = searchParams.get("format");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort");
    const contentRating = searchParams.get("content_rating");
    const creatorId = searchParams.get("creator_id");
    const excludeCreator = searchParams.get("exclude_creator");
    const statusFilter = parseStatusFilter(status);

    let query = supabase
      .from("projects")
      .select(
        `id, slug, title, hook, genre, format, tone, runtime_minutes, episode_count,
         synopsis, inspiration_line, premiere_date, delivered_at,
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
      .neq("is_test", true);

    // Full-text search via Meilisearch (falls back to ilike)
    if (search && search.trim().length > 0) {
      let meiliIds: string[] | null = null;
      try {
        await ensureProjectsIndex();
        const meiliResults = await meiliSearch<ProjectSearchDocument>("projects", search.trim(), {
          limit: 100,
        });
        meiliIds = meiliResults.hits.map((h: ProjectSearchDocument) => h.id);
      } catch {
        // Meilisearch unavailable — fall back to ilike
      }

      if (meiliIds !== null) {
        if (meiliIds.length === 0) {
          // Meilisearch returned nothing — return empty
          return NextResponse.json({ projects: [], hasMore: false, nextCursor: null });
        }
        query = query.in("id", meiliIds);
      } else {
        // Fallback: ilike on title
        const sanitized = search.replace(/[%_\\(),.\"']/g, "");
        if (sanitized.length > 0) {
          query = query.ilike("title", `%${sanitized}%`);
        }
      }
    }

    // Genre filter
    if (genre) {
      query = query.eq("genre", genre);
    }

    // Format filter
    if (format) {
      query = query.eq("format", format);
    }

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    if (excludeCreator) {
      query = query.neq("creator_id", excludeCreator);
    }

    // Content rating filter
    if (contentRating) {
      query = query.eq("content_rating", contentRating);
    }

    // Status filter
    if (statusFilter && statusFilter.length === 1) {
      query = query.eq("lifecycle_status", statusFilter[0]);
    } else if (statusFilter && statusFilter.length > 1) {
      query = query.in("lifecycle_status", statusFilter);
    } else {
      // Exclude terminal statuses from default browse
      query = query.not("lifecycle_status", "in", "(failed_to_unlock,cancelled)");
    }

    // Sort
    if (sort === "trending") {
      query = query.order("preorder_count_cache", { ascending: false });
    } else if (sort === "almost_unlocked") {
      // Fetch unlocking projects — will re-sort by proximity ratio after query
      query = query
        .eq("lifecycle_status", "unlocking")
        .gt("unlock_target", 0)
        .order("preorder_count_cache", { ascending: false });
    } else if (sort === "momentum") {
      query = query
        .order("preorder_count_cache", { ascending: false })
        .order("like_count_cache", { ascending: false })
        .order("updated_at", { ascending: false });
    } else if (sort === "recent_activity") {
      query = query
        .order("updated_at", { ascending: false })
        .order("purchase_count_cache", { ascending: false })
        .order("preorder_count_cache", { ascending: false });
    } else {
      // Default: 'new' or unspecified — newest first
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(cursor, cursor + limit);

    const { data: projects, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Re-sort "almost_unlocked" by proximity ratio (highest % first)
    if (sort === "almost_unlocked" && projects) {
      projects.sort((a, b) => {
        const ratioA = a.unlock_target ? a.preorder_count_cache / a.unlock_target : 0;
        const ratioB = b.unlock_target ? b.preorder_count_cache / b.unlock_target : 0;
        return ratioB - ratioA;
      });
    }

    // Compute preorders_today for each project
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
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

    const enriched: Array<Record<string, unknown>> = (projects ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      preorders_today: preordersTodayMap[p.id as string] ?? 0,
    }));

    if (sort === "recent_activity") {
      enriched.sort((a, b) => {
        const statusPriorityDelta =
          (LIFECYCLE_STATUS_PRIORITY[a.lifecycle_status as string] ?? 99) -
          (LIFECYCLE_STATUS_PRIORITY[b.lifecycle_status as string] ?? 99);
        if (statusPriorityDelta !== 0) return statusPriorityDelta;

        if (a.lifecycle_status === "premiering" && b.lifecycle_status === "premiering") {
          return parseDateValue(a.premiere_date as string | null) - parseDateValue(b.premiere_date as string | null);
        }

        if (a.lifecycle_status === "released" && b.lifecycle_status === "released") {
          return parseDateValue(b.delivered_at as string | null) - parseDateValue(a.delivered_at as string | null);
        }

        if (a.lifecycle_status === "in_production" && b.lifecycle_status === "in_production") {
          return (b.update_count_cache as number) - (a.update_count_cache as number);
        }

        return parseDateValue(b.created_at as string) - parseDateValue(a.created_at as string);
      });
    }

    if (sort === "momentum") {
      enriched.sort((a, b) => {
        const priority = (statusValue: string) => {
          if (statusValue === "unlocking") return 0;
          if (statusValue === "in_production") return 1;
          return 2;
        };

        const priorityDelta = priority(a.lifecycle_status as string) - priority(b.lifecycle_status as string);
        if (priorityDelta !== 0) return priorityDelta;

        const todayDelta = (b.preorders_today as number) - (a.preorders_today as number);
        if (todayDelta !== 0) return todayDelta;

        const preorderDelta = (b.preorder_count_cache as number) - (a.preorder_count_cache as number);
        if (preorderDelta !== 0) return preorderDelta;

        return parseDateValue(b.created_at as string) - parseDateValue(a.created_at as string);
      });
    }

    const hasMore = enriched.length > limit;
    const trimmed = hasMore ? enriched.slice(0, limit) : enriched;
    const nextCursor = hasMore ? cursor + limit : null;

    return NextResponse.json({
      projects: trimmed,
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
