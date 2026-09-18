import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { logFailedAuth } from "@/lib/auth-checks";
import { indexProjectById, removeProjectFromIndex } from "@/lib/meilisearch/client";

type ModerationAction = "flag" | "suspend" | "unflag" | "unsuspend" | "override_rating" | "approve_film" | "reject_film";

const ACTION_TO_STATUS: Record<string, string> = {
  flag: "flagged",
  suspend: "suspended",
  unflag: "live",
  unsuspend: "live",
};

const VALID_ACTIONS = new Set<string>(["flag", "suspend", "unflag", "unsuspend", "override_rating", "approve_film", "reject_film"]);

const VALID_RATINGS = new Set<string>(["general", "teen", "mature"]);

// POST /api/admin/projects/[id]/moderate — Flag/suspend/unflag/unsuspend a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("admin-moderate", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/admin/projects/moderate", "POST");
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

    let action: string = "";
    let reason: string = "";
    let rating: string = "";
    try {
      const body = await request.json();
      action = body.action ?? "";
      reason = body.reason ?? "";
      rating = body.rating ?? "";
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be: flag, suspend, unflag, unsuspend, override_rating, approve_film, or reject_film" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get current project
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id, moderation_status, creator_id, content_rating, film_review_status, lifecycle_status")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // --- Content rating override ---
    if (action === "override_rating") {
      if (!VALID_RATINGS.has(rating)) {
        return NextResponse.json({ error: "Invalid rating. Must be: general, teen, or mature" }, { status: 400 });
      }
      // Only allow upgrading (general < teen < mature)
      const RATING_ORDER = { general: 0, teen: 1, mature: 2 } as Record<string, number>;
      const currentRating = project.content_rating ?? "general";
      if ((RATING_ORDER[rating] ?? 0) <= (RATING_ORDER[currentRating] ?? 0)) {
        return NextResponse.json({ error: "Can only override to a higher rating" }, { status: 400 });
      }
      const { error: ratingError } = await admin
        .from("projects")
        .update({ admin_rating_override: rating })
        .eq("id", id);
      if (ratingError) {
        return NextResponse.json({ error: "Failed to override rating" }, { status: 500 });
      }
      await admin.from("project_status_history").insert({
        project_id: id,
        from_status: currentRating,
        to_status: `rating_override:${rating}`,
        reason: reason || `Admin overrode content rating to ${rating}`,
        actor_user_id: user.id,
      });
      await admin.from("notifications").insert({
        user_id: project.creator_id,
        type: "admin_moderation",
        title: "Content rating updated",
        message: `Your project's content rating has been updated to ${rating.charAt(0).toUpperCase() + rating.slice(1)} by a moderator.`,
        link: "/dashboard",
      });
      return NextResponse.json({ success: true, admin_rating_override: rating });
    }

    // --- Film review (quality review queue) ---
    if (action === "approve_film" || action === "reject_film") {
      const newStatus = action === "approve_film" ? "approved" : "rejected";
      const { error: filmError } = await admin
        .from("projects")
        .update({ film_review_status: newStatus })
        .eq("id", id);
      if (filmError) {
        return NextResponse.json({ error: "Failed to update film review" }, { status: 500 });
      }
      await admin.from("project_status_history").insert({
        project_id: id,
        from_status: project.film_review_status ?? "pending",
        to_status: `film_review:${newStatus}`,
        reason: reason || `Admin ${action === "approve_film" ? "approved" : "rejected"} film`,
        actor_user_id: user.id,
      });
      await admin.from("notifications").insert({
        user_id: project.creator_id,
        type: "admin_moderation",
        title: action === "approve_film" ? "Film approved" : "Film rejected",
        message: action === "approve_film"
          ? "Your film has been approved! You can now schedule the premiere."
          : `Your film was not approved. ${reason || "Please review and re-upload."}`,
        link: "/dashboard",
      });

      // On approval: release payout, held balance, and increment delivery count
      if (action === "approve_film") {
        const now = new Date().toISOString();

        // Release delivery payout
        const { error: payoutError } = await admin
          .from("project_payout_releases")
          .update({ status: "available", available_at: now })
          .eq("project_id", id)
          .eq("release_type", "delivery");
        if (payoutError) {
          console.error("[api] approve_film payout release error:", payoutError);
        }

        // Release held balance for this project
        const { data: fEvents } = await admin
          .from("project_financial_events")
          .select("metadata_json")
          .eq("project_id", id)
          .eq("event_type", "platform_fee");

        const heldAmount = (fEvents ?? []).reduce((sum: number, ev: { metadata_json: unknown }) => {
          const held = (ev.metadata_json as Record<string, number> | null)?.held ?? 0;
          return sum + held;
        }, 0);

        if (heldAmount > 0) {
          const { error: releaseError } = await admin.rpc("release_held_balance", {
            p_profile_id: project.creator_id,
            p_amount: heldAmount,
          });
          if (releaseError) {
            console.error("[api] approve_film release_held_balance error:", releaseError);
          }
        }

        // Increment delivered_project_count (determines payout tier for future projects)
        const { error: countErr } = await admin.rpc("increment_delivered_count", {
          p_profile_id: project.creator_id,
        });
        if (countErr) {
          console.error("[api] approve_film increment_delivered_count error:", countErr);
        }
      }

      // If rejected, increment strike for repeat rejections (check history)
      if (action === "reject_film") {
        const { data: rejections } = await admin
          .from("project_status_history")
          .select("id")
          .eq("project_id", id)
          .like("to_status", "film_review:rejected");
        if (rejections && rejections.length > 1) {
          // Second+ rejection = strike
          await admin.rpc("increment_strike_count", { p_profile_id: project.creator_id });
        }
      }
      return NextResponse.json({ success: true, film_review_status: newStatus });
    }

    // --- Standard moderation actions ---
    const fromStatus = project.moderation_status;
    const toStatus = ACTION_TO_STATUS[action];

    // Update moderation status
    const { error: updateError } = await admin
      .from("projects")
      .update({ moderation_status: toStatus })
      .eq("id", id);

    if (updateError) {
      console.error("[api] moderate update error:", updateError);
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }

    // Log to status history
    await admin.from("project_status_history").insert({
      project_id: id,
      from_status: fromStatus,
      to_status: toStatus,
      reason: reason || `Admin ${action}`,
      actor_user_id: user.id,
    });

    // Notify creator
    const notificationMessages: Record<string, string> = {
      flag: "Your project has been flagged for review by a moderator.",
      suspend: "Your project has been suspended. Please contact support.",
      unflag: "Your project has been cleared and is live again.",
      unsuspend: "Your project has been reinstated and is live again.",
    };

    await admin.from("notifications").insert({
      user_id: project.creator_id,
      type: "admin_moderation",
      title: action === "flag" ? "Project flagged" : action === "suspend" ? "Project suspended" : "Project restored",
      message: notificationMessages[action] ?? "",
      link: "/dashboard",
    });

    // Update Meilisearch index
    if (toStatus === "suspended") {
      removeProjectFromIndex(id);
    } else {
      indexProjectById(id);
    }

    return NextResponse.json({
      success: true,
      moderation_status: toStatus,
    });
  } catch (err) {
    console.error("[api] admin moderate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
