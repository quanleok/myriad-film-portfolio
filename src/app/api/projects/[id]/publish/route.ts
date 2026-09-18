// Admin publish route: approves projects in pending_review.
// Used for: (1) direct_premiere/direct_release (film + project approval in one step),
// (2) legacy projects stuck in pending_review, (3) teaser/preorder/production modes.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { indexProjectById } from "@/lib/meilisearch/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-publish", 10);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the project
    const adminSupabase = createAdminClient();
    const { data: project } = await adminSupabase
      .from("projects")
      .select(
        "id, creator_id, moderation_status, lifecycle_status, launch_mode, campaign_duration_days, production_window_days, film_video_id, release_price_cents"
      )
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.moderation_status !== "pending_review") {
      return NextResponse.json(
        { error: "Only projects pending review can be published" },
        { status: 400 }
      );
    }

    const now = new Date();
    const launchMode = project.launch_mode || "preorder";
    const isTeaserMode = launchMode === "teaser";
    const isProductionMode = launchMode === "production";
    const isDirectPremiere = launchMode === "direct_premiere";
    const isDirectRelease = launchMode === "direct_release";

    const updates: Record<string, unknown> = {
      moderation_status: "live",
      visibility: "public",
      lifecycle_status: "unlocking",
      campaign_starts_at: now.toISOString(),
      campaign_ends_at: null,
      greenlit_at: null,
      greenlit_by: null,
      estimated_delivery_at: null,
      delivery_deadline: null,
      manual_greenlight_eligible: false,
    };

    if (isTeaserMode) {
      updates.lifecycle_status = "teaser";
      updates.campaign_starts_at = null;
      updates.campaign_ends_at = null;
      updates.greenlit_at = null;
      updates.greenlit_by = null;
      updates.estimated_delivery_at = null;
      updates.delivery_deadline = null;
      updates.manual_greenlight_eligible = false;
      updates.unlock_target = null;
      updates.campaign_duration_days = null;
      updates.production_window_days = null;
      updates.preorder_price_cents = null;
      updates.release_price_cents = null;
      updates.premiere_date = null;
      updates.film_video_id = null;
      updates.delivered_at = null;
    } else if (isDirectPremiere) {
      // Film already uploaded — admin approves project + film in one step.
      // Creator can now schedule premiere via the premiere route.
      if (!project.film_video_id) {
        return NextResponse.json(
          { error: "Cannot approve direct premiere: no film uploaded" },
          { status: 400 }
        );
      }
      updates.lifecycle_status = "premiering";
      updates.film_review_status = "approved";
      updates.delivered_at = now.toISOString();
      updates.campaign_starts_at = null;
      updates.campaign_ends_at = null;
      updates.release_option = "premium_purchase";
      updates.purchase_price_cents = project.release_price_cents;
    } else if (isDirectRelease) {
      // Film already uploaded — admin approves, project goes straight to released.
      if (!project.film_video_id) {
        return NextResponse.json(
          { error: "Cannot approve direct release: no film uploaded" },
          { status: 400 }
        );
      }
      updates.lifecycle_status = "released";
      updates.film_review_status = "approved";
      updates.delivered_at = now.toISOString();
      updates.campaign_starts_at = null;
      updates.campaign_ends_at = null;
      updates.release_option = project.release_price_cents ? "premium_purchase" : "free";
      updates.purchase_price_cents = project.release_price_cents;
    } else if (isProductionMode) {
      const productionWindowDays = project.production_window_days || 60;
      const estimatedDelivery = new Date(now);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + productionWindowDays);
      updates.lifecycle_status = "in_production";
      updates.greenlit_at = now.toISOString();
      updates.greenlit_by = "manual";
      updates.estimated_delivery_at = estimatedDelivery.toISOString();
      updates.delivery_deadline = estimatedDelivery.toISOString();
      updates.campaign_starts_at = null;
      updates.campaign_duration_days = null;
      updates.unlock_target = null;
    } else {
      const campaignEndsAt = new Date(now);
      campaignEndsAt.setDate(
        campaignEndsAt.getDate() + (project.campaign_duration_days || 30)
      );
      updates.campaign_ends_at = campaignEndsAt.toISOString();
    }

    // Update project via admin client
    const { data: updated, error: updateError } = await adminSupabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[api] project publish error:", updateError);
      return NextResponse.json(
        { error: "Failed to publish project" },
        { status: 500 }
      );
    }

    // For direct modes: publish the video so it's watchable
    if ((isDirectPremiere || isDirectRelease) && project.film_video_id) {
      const videoUpdate: Record<string, unknown> = {
        is_published: true,
        pricing_model: project.release_price_cents ? "premium" : "free",
        price_cents: project.release_price_cents || null,
      };

      // Direct release: video is immediately available (no premiere gate)
      // Direct premiere: video is published but premiere scheduling is separate
      if (isDirectPremiere) {
        videoUpdate.is_published = false; // stays unpublished until premiere is scheduled
      }

      const { error: videoError } = await adminSupabase
        .from("videos")
        .update(videoUpdate)
        .eq("id", project.film_video_id);

      if (videoError) {
        console.error("[api] publish video update error:", videoError);
      }
    }

    // Determine the target lifecycle status for history
    let toStatus: string;
    let reason: string;
    if (isTeaserMode) {
      toStatus = "teaser";
      reason = "Admin approved and published teaser project";
    } else if (isDirectPremiere) {
      toStatus = "premiering";
      reason = "Admin approved direct premiere — film approved, premiere can be scheduled";
    } else if (isDirectRelease) {
      toStatus = "released";
      reason = "Admin approved direct release — film published and available";
    } else if (isProductionMode) {
      toStatus = "in_production";
      reason = "Admin approved and published direct-to-production project";
    } else {
      toStatus = "unlocking";
      reason = "Admin approved and published project";
    }

    // Insert status history
    const { error: historyError } = await adminSupabase
      .from("project_status_history")
      .insert({
        project_id: id,
        from_status: project.lifecycle_status,
        to_status: toStatus,
        reason,
        actor_user_id: user.id,
      });

    if (historyError) {
      console.error("[api] status history insert error:", historyError);
    }

    // Index to Meilisearch (now live and discoverable)
    indexProjectById(id);

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
