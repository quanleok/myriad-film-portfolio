import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const rateLimited = await checkRateLimit("admin-users", 30);
    if (rateLimited) return rateLimited;

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const filter = searchParams.get("filter") ?? "all";
    const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);
    const limit = 25;

    let query = supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_creator, is_banned, is_admin, created_at, follower_count, subscriber_count, star_level, total_views, dispute_count, account_frozen");

    if (search) {
      // Sanitize search input — escape PostgREST special characters to prevent filter injection
      const safeSearch = search.replace(/[%_\\(),."']/g, "");
      if (safeSearch) {
        query = query.or(`display_name.ilike.%${safeSearch}%,username.ilike.%${safeSearch}%`);
      }
    }

    if (filter === "creators") {
      query = query.eq("is_creator", true);
    } else if (filter === "banned") {
      query = query.eq("is_banned", true);
    } else if (filter === "frozen") {
      query = query.eq("account_frozen", true);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(cursor, cursor + limit - 1);

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Get video counts for each user
    const userIds = (data ?? []).map((u) => u.id);
    const { data: videoCounts } = await supabase
      .from("videos")
      .select("creator_id")
      .in("creator_id", userIds.length > 0 ? userIds : ["__none__"]);

    const videoCountMap: Record<string, number> = {};
    for (const v of videoCounts ?? []) {
      if (v.creator_id) {
        videoCountMap[v.creator_id] = (videoCountMap[v.creator_id] ?? 0) + 1;
      }
    }

    const users = (data ?? []).map((u) => ({
      ...u,
      video_count: videoCountMap[u.id] ?? 0,
    }));

    return NextResponse.json({
      users,
      hasMore: (data ?? []).length === limit,
      nextCursor: (data ?? []).length === limit ? cursor + limit : null,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/users — Ban/unban users
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-users-action", 10);
    if (rateLimited) return rateLimited;

    const { error, supabase, user } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { action, userId, reason } = body as {
      action: "ban" | "unban" | "freeze" | "unfreeze" | "soft_delete";
      userId: string;
      reason?: string;
    };

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing action or userId" }, { status: 400 });
    }

    // Prevent actions on other admins
    if (action === "ban" || action === "freeze" || action === "soft_delete") {
      const { data: target } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();
      if (target?.is_admin) {
        return NextResponse.json({ error: "Cannot modify an admin user" }, { status: 403 });
      }
    }

    // Soft delete: mark as deleted, abandon active projects, refund preorders
    if (action === "soft_delete") {
      const admin = createAdminClient();
      const now = new Date().toISOString();

      // Soft-delete the profile
      const { error: deleteError } = await admin
        .from("profiles")
        .update({
          deleted_at: now,
          deletion_reason: reason || "Admin-initiated deletion",
          is_banned: true, // Block all activity
        })
        .eq("id", userId);
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      // Cancel active projects (unlocking/in_production) — triggers refunds via existing flows
      const { data: activeProjects } = await admin
        .from("projects")
        .select("id, lifecycle_status")
        .eq("creator_id", userId)
        .in("lifecycle_status", ["unlocking", "in_production"]);

      for (const proj of activeProjects ?? []) {
        await admin
          .from("projects")
          .update({
            lifecycle_status: "cancelled",
            moderation_status: "suspended",
          })
          .eq("id", proj.id);
        await admin.from("project_status_history").insert({
          project_id: proj.id,
          from_status: proj.lifecycle_status,
          to_status: "cancelled",
          reason: "Account deleted — all active projects cancelled",
          actor_user_id: user.id,
        });
      }

      // Released content stays (viewers paid for it) — no action needed
      return NextResponse.json({ success: true, deleted: true });
    }

    if (action === "freeze" || action === "unfreeze") {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ account_frozen: action === "freeze" })
        .eq("id", userId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    const is_banned = action === "ban";

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_banned })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If banning, also unpublish all their videos
    if (is_banned) {
      await supabase
        .from("videos")
        .update({ is_published: false })
        .eq("creator_id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
