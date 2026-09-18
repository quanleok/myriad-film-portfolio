import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimited = await checkRateLimit("premieres-browse", 60);
  if (rateLimited) return rateLimited;

  const url = req.nextUrl;
  const tab = url.searchParams.get("tab") || "all";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(48, Math.max(1, parseInt(url.searchParams.get("limit") || "24", 10)));
  const offset = (page - 1) * limit;
  const before = url.searchParams.get("before");
  const sort = url.searchParams.get("sort") || "date";

  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select(
      `id, slug, title, hook, genre, format, tone, runtime_minutes,
       teaser_asset_id, teaser_thumbnail_url, release_price_cents,
       preorder_price_cents, preorder_count_cache, like_count_cache, interest_count_cache,
       purchase_count_cache, unlock_target, launch_mode,
       lifecycle_status, moderation_status, content_rating,
       premiere_date, release_option, created_at,
       profiles!inner(display_name, username, avatar_url, is_creator)`
    )
    .eq("moderation_status", "live")
    .neq("is_test", true)
    .in("lifecycle_status", ["premiering", "released"]);

  const now = new Date();

  if (tab === "premiering") {
    query = query.eq("lifecycle_status", "premiering");
  } else if (tab === "released") {
    query = query.eq("lifecycle_status", "released");
  } else if (tab === "this_week") {
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    query = query.or(
      `and(premiere_date.not.is.null,premiere_date.gte.${now.toISOString()},premiere_date.lte.${weekFromNow.toISOString()}),and(lifecycle_status.eq.premiering,premiere_date.is.null)`
    );
  } else if (tab === "this_month") {
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    query = query.or(
      `and(premiere_date.not.is.null,premiere_date.gte.${now.toISOString()},premiere_date.lte.${monthFromNow.toISOString()}),and(lifecycle_status.eq.premiering,premiere_date.is.null)`
    );
  }

  if (before) {
    query = query.lt("created_at", before);
  }

  if (sort === "popular") {
    // Sort by engagement for spotlight: likes + preorders, closest premiere date
    query = query
      .order("like_count_cache", { ascending: false })
      .order("preorder_count_cache", { ascending: false })
      .order("premiere_date", { ascending: true, nullsFirst: false });
  } else {
    query = query
      .order("premiere_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Premieres GET error:", error);
    return NextResponse.json({ error: "Failed to fetch premieres" }, { status: 500 });
  }

  return NextResponse.json({
    projects: data ?? [],
    page,
    limit,
    hasMore: (data?.length ?? 0) === limit,
  });
}
