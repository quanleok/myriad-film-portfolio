import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null as any, user: null as any };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), supabase: null as any, user: null as any };
  }

  return { error: null, supabase, user };
}

// GET /api/admin — Dashboard stats
export async function GET() {
  try {
    const rateLimited = await checkRateLimit("admin-dashboard", 30);
    if (rateLimited) return rateLimited;

    const { error, supabase } = await requireAdmin();
    if (error) return error;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const [
      usersRes,
      creatorsRes,
      videosRes,
      totalRevenueRes,
      monthRevenueRes,
      newUsersRes,
      newVideosRes,
      activeUsersRes,
      pendingReportsRes,
      dailyUsersRes,
      dailyVideosRes,
      // Project safety stats
      greenlightQueueRes,
      approachingDeadlineRes,
      overdueProjectsRes,
      filmReviewQueueRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_creator", true),
      supabase.from("videos").select("id", { count: "exact", head: true }),
      supabase.from("project_financial_events").select("amount_cents").eq("event_type", "platform_fee"),
      supabase.from("project_financial_events").select("amount_cents").eq("event_type", "platform_fee").gte("created_at", startOfMonth),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("videos").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      supabase.from("video_views").select("viewer_id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo).not("viewer_id", "is", null),
      supabase.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      // Daily new users for the past 7 days
      supabase.from("profiles").select("created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: true }),
      // Daily new videos for the past 7 days
      supabase.from("videos").select("created_at").gte("created_at", sevenDaysAgo).order("created_at", { ascending: true }),
      // Greenlight queue: projects eligible for manual greenlight
      supabase.from("projects").select("id, title, slug, creator_id, preorder_count_cache, unlock_target, campaign_ends_at, profiles(display_name, username)", { count: "exact" }).eq("lifecycle_status", "unlocking").eq("manual_greenlight_eligible", true),
      // Approaching deadlines: in_production with delivery_deadline within 3 days
      supabase.from("projects").select("id, title, slug, creator_id, delivery_deadline, grace_period_end, profiles(display_name, username)", { count: "exact" }).eq("lifecycle_status", "in_production").eq("is_overdue", false).not("delivery_deadline", "is", null).lte("delivery_deadline", threeDaysFromNow).gte("delivery_deadline", nowIso),
      // Overdue projects
      supabase.from("projects").select("id, title, slug, creator_id, delivery_deadline, grace_period_end, is_overdue, profiles(display_name, username)", { count: "exact" }).eq("lifecycle_status", "in_production").eq("is_overdue", true),
      // Film review queue: first-time creators with pending film review
      supabase.from("projects").select("id, title, slug, creator_id, film_review_status, profiles(display_name, username, delivered_project_count)", { count: "exact" }).eq("film_review_status", "pending"),
    ]);

    const totalRevenue = (totalRevenueRes.data ?? []).reduce(
      (sum, r) => sum + (r.amount_cents ?? 0),
      0
    );

    const monthRevenue = (monthRevenueRes.data ?? []).reduce(
      (sum, r) => sum + (r.amount_cents ?? 0),
      0
    );

    // Group daily data
    function groupByDay(records: { created_at: string }[]) {
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        days[key] = 0;
      }
      for (const r of records) {
        const key = r.created_at.slice(0, 10);
        if (key in days) days[key]++;
      }
      return Object.entries(days).map(([date, count]) => ({
        date,
        count,
      }));
    }

    return NextResponse.json({
      totalUsers: usersRes.count ?? 0,
      totalCreators: creatorsRes.count ?? 0,
      totalVideos: videosRes.count ?? 0,
      totalRevenueCents: totalRevenue,
      monthRevenueCents: monthRevenue,
      newUsersThisWeek: newUsersRes.count ?? 0,
      newVideosThisWeek: newVideosRes.count ?? 0,
      activeUsersThisWeek: activeUsersRes.count ?? 0,
      pendingReports: pendingReportsRes.count ?? 0,
      dailyUsers: groupByDay(dailyUsersRes.data ?? []),
      dailyVideos: groupByDay(dailyVideosRes.data ?? []),
      // Project safety stats
      greenlightQueue: greenlightQueueRes.data ?? [],
      greenlightQueueCount: greenlightQueueRes.count ?? 0,
      approachingDeadlines: approachingDeadlineRes.data ?? [],
      approachingDeadlineCount: approachingDeadlineRes.count ?? 0,
      overdueProjects: overdueProjectsRes.data ?? [],
      overdueProjectCount: overdueProjectsRes.count ?? 0,
      filmReviewQueue: filmReviewQueueRes.data ?? [],
      filmReviewQueueCount: filmReviewQueueRes.count ?? 0,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
