import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const rateLimited = await checkRateLimit("admin-project-stats", 30);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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

    const admin = createAdminClient();

    // Fetch all projects with minimal fields for counting
    const { data: projects } = await admin
      .from("projects")
      .select("lifecycle_status, moderation_status, preorder_count_cache");

    const all = projects ?? [];

    // Lifecycle status counts
    const lifecycleCounts: Record<string, number> = {};
    for (const p of all) {
      const s = p.lifecycle_status ?? "unknown";
      lifecycleCounts[s] = (lifecycleCounts[s] ?? 0) + 1;
    }

    // Moderation status counts
    const moderationCounts: Record<string, number> = {};
    for (const p of all) {
      const s = p.moderation_status ?? "unknown";
      moderationCounts[s] = (moderationCounts[s] ?? 0) + 1;
    }

    // Total preorders
    const totalPreorders = all.reduce(
      (sum, p) => sum + (p.preorder_count_cache ?? 0),
      0
    );

    // Total preorder revenue from project_preorders
    const { data: revenueData } = await admin
      .from("project_preorders")
      .select("amount_cents")
      .in("current_status", ["active", "committed"]);

    const totalRevenueCents = (revenueData ?? []).reduce(
      (sum, r) => sum + (r.amount_cents ?? 0),
      0
    );

    return NextResponse.json({
      totalProjects: all.length,
      lifecycleCounts,
      moderationCounts,
      totalPreorders,
      totalRevenueCents,
      pendingReview: moderationCounts["pending_review"] ?? 0,
      flagged: moderationCounts["flagged"] ?? 0,
      suspended: moderationCounts["suspended"] ?? 0,
    });
  } catch (err) {
    console.error("[api] admin project stats error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
