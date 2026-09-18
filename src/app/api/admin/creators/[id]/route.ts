import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("admin-creator-detail", 30);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const admin = createAdminClient();

    // Fetch creator profile
    const { data: creator, error: creatorError } = await admin
      .from("profiles")
      .select(
        `id, display_name, username, avatar_url, bio, email,
         is_creator, is_banned, star_level, is_founding_creator, stripe_account_id, stripe_onboarding_complete,
         strike_count, creator_good_standing, delivered_project_count,
         available_balance_cents, held_balance_cents,
         follower_count, subscriber_count, total_views,
         created_at`
      )
      .eq("id", id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Fetch their projects
    const { data: projects } = await admin
      .from("projects")
      .select(
        `id, title, slug, lifecycle_status, moderation_status,
         preorder_count_cache, unlock_target, preorder_price_cents,
         created_at, delivered_at`
      )
      .eq("creator_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    const releasedProjectCount = (projects ?? []).filter(
      (project) =>
        project.lifecycle_status === "released" &&
        project.moderation_status === "live"
    ).length;

    // Fetch strike history from notifications
    const { data: strikes } = await admin
      .from("notifications")
      .select("title, message, created_at")
      .eq("user_id", id)
      .eq("type", "admin_strike")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      creator: {
        ...creator,
        released_project_count: releasedProjectCount,
        stripe_connected: !!(creator.stripe_account_id && creator.stripe_onboarding_complete),
      },
      projects: projects ?? [],
      strikes: strikes ?? [],
    });
  } catch (err) {
    console.error("[api] admin creator detail error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
