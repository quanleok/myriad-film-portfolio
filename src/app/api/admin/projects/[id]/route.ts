import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/admin/projects/[id] — Full project detail for admin review
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("admin-project-detail", 30);
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

    const { id } = await params;
    const admin = createAdminClient();

    // Fetch project with creator profile
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select(
        `id, title, slug, hook, synopsis, genre, tone, format, runtime_minutes,
         teaser_thumbnail_url, preorder_price_cents, release_price_cents,
         unlock_target, production_window_days, campaign_duration_days,
         campaign_starts_at, campaign_ends_at, unlocked_at, estimated_delivery_at,
         delivered_at, delivery_deadline, grace_period_end,
         lifecycle_status, moderation_status, visibility,
         preorder_count_cache, like_count_cache, discussion_count_cache,
         inspiration_line, is_overdue, premiere_date,
         content_rating, admin_rating_override, film_review_status,
         rights_attested_at, creator_terms_version,
         created_at, updated_at, creator_id`
      )
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch creator profile
    const { data: creator } = await admin
      .from("profiles")
      .select(
        "id, display_name, username, avatar_url, is_creator, strike_count, creator_good_standing, delivered_project_count, delivery_record_summary, dispute_count, account_frozen"
      )
      .eq("id", project.creator_id)
      .single();

    // Fetch character cards
    const { data: characters } = await admin
      .from("project_character_cards")
      .select("id, name, short_description, sort_order")
      .eq("project_id", id)
      .order("sort_order");

    // Fetch concept cards
    const { data: concepts } = await admin
      .from("project_concept_cards")
      .select("id, caption, sort_order")
      .eq("project_id", id)
      .order("sort_order");

    // Fetch status history
    const { data: statusHistory } = await admin
      .from("project_status_history")
      .select("from_status, to_status, reason, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch project updates (progress proofs for admin review)
    const { data: updates } = await admin
      .from("project_updates")
      .select(
        "id, update_type, title, body, is_progress_proof, review_status, created_at"
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      project,
      creator: creator ?? null,
      characters: characters ?? [],
      concepts: concepts ?? [],
      statusHistory: statusHistory ?? [],
      updates: updates ?? [],
    });
  } catch (err) {
    console.error("[api] admin project detail error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
