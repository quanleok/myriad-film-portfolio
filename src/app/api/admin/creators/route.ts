import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null as any, user: null as any };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null as any, user: null as any };

  return { error: null, supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-creators", 30);
    if (rateLimited) return rateLimited;

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);
    const limit = 25;

    let query = supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, star_level, is_founding_creator, is_banned, follower_count, total_views, stripe_account_id, stripe_onboarding_complete, strike_count, creator_good_standing, available_balance_cents, created_at")
      .eq("is_creator", true);

    if (search) {
      // Sanitize search input — escape PostgREST special characters to prevent filter injection
      const safeSearch = search.replace(/[%_\\(),."']/g, "");
      if (safeSearch) {
        query = query.or(`display_name.ilike.%${safeSearch}%,username.ilike.%${safeSearch}%`);
      }
    }

    query = query
      .order("created_at", { ascending: false })
      .range(cursor, cursor + limit - 1);

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Get video counts and total earnings for each creator
    const creatorIds = (data ?? []).map((c) => c.id);

    const ids = creatorIds.length > 0 ? creatorIds : ["__none__"];
    const [videoCountsRes, projectStatusRes] = await Promise.all([
      supabase
        .from("videos")
        .select("creator_id")
        .in("creator_id", ids),
      supabase
        .from("projects")
        .select("creator_id, lifecycle_status, moderation_status")
        .in("creator_id", ids),
    ]);

    const videoCountMap: Record<string, number> = {};
    for (const v of videoCountsRes.data ?? []) {
      if (v.creator_id) {
        videoCountMap[v.creator_id] = (videoCountMap[v.creator_id] ?? 0) + 1;
      }
    }

    const releasedProjectCountMap: Record<string, number> = {};
    for (const project of projectStatusRes.data ?? []) {
      if (
        project.creator_id &&
        project.lifecycle_status === "released" &&
        project.moderation_status === "live"
      ) {
        releasedProjectCountMap[project.creator_id] =
          (releasedProjectCountMap[project.creator_id] ?? 0) + 1;
      }
    }

    const creators = (data ?? []).map((c) => ({
      ...c,
      video_count: videoCountMap[c.id] ?? 0,
      released_project_count: releasedProjectCountMap[c.id] ?? 0,
      stripe_connected: !!(c.stripe_account_id && c.stripe_onboarding_complete),
    }));

    return NextResponse.json({
      creators,
      hasMore: (data ?? []).length === limit,
      nextCursor: (data ?? []).length === limit ? cursor + limit : null,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/creators — Perform actions on creators
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-creators-action", 10);
    if (rateLimited) return rateLimited;

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { action, creatorId, value } = body as {
      action: "set_star_level" | "set_editors_pick" | "ban" | "unban";
      creatorId: string;
      value?: number | boolean;
    };

    if (!action || !creatorId) {
      return NextResponse.json({ error: "Missing action or creatorId" }, { status: 400 });
    }

    switch (action) {
      case "set_star_level": {
        const level = Math.max(0, Math.min(3, Number(value) || 0));
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ star_level: level })
          .eq("id", creatorId);

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
        break;
      }
      case "set_editors_pick": {
        const { videoId } = body as { videoId?: string };
        if (!videoId) {
          return NextResponse.json({ error: "Missing videoId for set_editors_pick" }, { status: 400 });
        }
        const { error: updateError } = await supabase
          .from("videos")
          .update({ is_editors_pick: !!value })
          .eq("id", videoId)
          .eq("creator_id", creatorId);

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
        break;
      }
      case "ban": {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ is_banned: true })
          .eq("id", creatorId);

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

        await supabase
          .from("videos")
          .update({ is_published: false })
          .eq("creator_id", creatorId);
        break;
      }
      case "unban": {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ is_banned: false })
          .eq("id", creatorId);

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
