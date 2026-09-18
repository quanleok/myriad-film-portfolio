import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { indexProjectById } from "@/lib/meilisearch/client";
import { getStripeOnboardingStatus } from "@/lib/stripe/connect";
import {
  CAMPAIGN_DURATION_MAX,
  CAMPAIGN_DURATION_MIN,
  PREORDER_PRICE_MAX,
  PREORDER_PRICE_MIN,
  PRODUCTION_WINDOW_MAX,
  PRODUCTION_WINDOW_MIN,
  RELEASE_PRICE_MAX,
  RELEASE_PRICE_MIN,
  UNLOCK_TARGET_MAX,
  UNLOCK_TARGET_MIN,
} from "@/types/project";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-convert", 10);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const targetLaunchMode = String(body.target_launch_mode ?? "");
    if (targetLaunchMode !== "preorder" && targetLaunchMode !== "production") {
      return NextResponse.json(
        { error: "target_launch_mode must be preorder or production" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, delivered_project_count, creator_good_standing")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    let stripeReady = Boolean(profile?.stripe_onboarding_complete);
    if (profile?.stripe_account_id && !stripeReady) {
      try {
        stripeReady = await getStripeOnboardingStatus(profile.stripe_account_id);
        if (stripeReady !== Boolean(profile.stripe_onboarding_complete)) {
          await supabase
            .from("profiles")
            .update({ stripe_onboarding_complete: stripeReady })
            .eq("id", user.id);
        }
      } catch (error) {
        console.error("[project-convert] failed to refresh Stripe onboarding:", error);
      }
    }

    if (!stripeReady) {
      return NextResponse.json(
        { error: "Please complete Stripe payout onboarding before converting this teaser" },
        { status: 400 }
      );
    }

    if (profile.creator_good_standing === false) {
      return NextResponse.json(
        { error: "Your account is not in good standing. Please resolve any overdue projects before converting this teaser." },
        { status: 403 }
      );
    }

    const { count: overdueCount } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .eq("is_overdue", true);

    if (overdueCount && overdueCount > 0) {
      return NextResponse.json(
        { error: "You have an overdue project. Please deliver it before converting this teaser." },
        { status: 403 }
      );
    }

    const deliveredCount = profile.delivered_project_count ?? 0;
    const maxActive = deliveredCount >= 3 ? Infinity : deliveredCount >= 1 ? 3 : 1;
    if (maxActive !== Infinity) {
      const { count: activeCount } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .neq("id", id)
        .in("lifecycle_status", ["unlocking", "in_production", "premiering"]);

      if ((activeCount ?? 0) >= maxActive) {
        const limitMsg = maxActive === 1
          ? "New creators can only have 1 active project at a time. Deliver your current project first."
          : `You can have up to ${maxActive} active projects. Deliver a current project first.`;
        return NextResponse.json({ error: limitMsg }, { status: 400 });
      }
    }

    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, creator_id, slug, launch_mode, lifecycle_status, moderation_status, title, teaser_asset_id")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.launch_mode !== "teaser" || project.lifecycle_status !== "teaser") {
      return NextResponse.json(
        { error: "Only live teaser projects can be converted" },
        { status: 400 }
      );
    }

    if (!project.teaser_asset_id) {
      return NextResponse.json(
        { error: "Teaser video is required before conversion" },
        { status: 400 }
      );
    }

    const preorderPriceCents = Number(body.preorder_price_cents);
    if (!Number.isFinite(preorderPriceCents) || preorderPriceCents < PREORDER_PRICE_MIN || preorderPriceCents > PREORDER_PRICE_MAX) {
      return NextResponse.json(
        { error: `preorder_price_cents must be between ${PREORDER_PRICE_MIN} and ${PREORDER_PRICE_MAX}` },
        { status: 400 }
      );
    }

    const releasePriceInput = body.release_price_cents == null ? preorderPriceCents : Number(body.release_price_cents);
    if (!Number.isFinite(releasePriceInput) || releasePriceInput < RELEASE_PRICE_MIN || releasePriceInput > RELEASE_PRICE_MAX) {
      return NextResponse.json(
        { error: `release_price_cents must be between ${RELEASE_PRICE_MIN} and ${RELEASE_PRICE_MAX}` },
        { status: 400 }
      );
    }
    if (releasePriceInput < preorderPriceCents) {
      return NextResponse.json(
        { error: "release_price_cents must be greater than or equal to preorder_price_cents" },
        { status: 400 }
      );
    }

    const productionWindowDays = Number(body.production_window_days);
    if (!Number.isFinite(productionWindowDays) || productionWindowDays < PRODUCTION_WINDOW_MIN || productionWindowDays > PRODUCTION_WINDOW_MAX) {
      return NextResponse.json(
        { error: `production_window_days must be between ${PRODUCTION_WINDOW_MIN} and ${PRODUCTION_WINDOW_MAX}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      launch_mode: targetLaunchMode,
      preorder_price_cents: preorderPriceCents,
      release_price_cents: releasePriceInput,
      production_window_days: productionWindowDays,
      manual_greenlight_eligible: false,
      preorders_closed_at: null,
      delivered_at: null,
      film_video_id: null,
      premiere_date: null,
    };

    let toStatus: "unlocking" | "in_production";
    let reason: string;

    if (targetLaunchMode === "preorder") {
      const unlockTarget = Number(body.unlock_target);
      const campaignDurationDays = Number(body.campaign_duration_days);

      if (!Number.isFinite(unlockTarget) || unlockTarget < UNLOCK_TARGET_MIN || unlockTarget > UNLOCK_TARGET_MAX) {
        return NextResponse.json(
          { error: `unlock_target must be between ${UNLOCK_TARGET_MIN} and ${UNLOCK_TARGET_MAX}` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(campaignDurationDays) || campaignDurationDays < CAMPAIGN_DURATION_MIN || campaignDurationDays > CAMPAIGN_DURATION_MAX) {
        return NextResponse.json(
          { error: `campaign_duration_days must be between ${CAMPAIGN_DURATION_MIN} and ${CAMPAIGN_DURATION_MAX}` },
          { status: 400 }
        );
      }

      const campaignEndsAt = new Date(now);
      campaignEndsAt.setDate(campaignEndsAt.getDate() + campaignDurationDays);

      updates.lifecycle_status = "unlocking";
      updates.unlock_target = unlockTarget;
      updates.campaign_duration_days = campaignDurationDays;
      updates.campaign_starts_at = now.toISOString();
      updates.campaign_ends_at = campaignEndsAt.toISOString();
      updates.greenlit_at = null;
      updates.greenlit_by = null;
      updates.estimated_delivery_at = null;
      updates.delivery_deadline = null;
      toStatus = "unlocking";
      reason = "Creator converted teaser into preorder campaign";
    } else {
      const estimatedDelivery = new Date(now);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + productionWindowDays);

      updates.lifecycle_status = "in_production";
      updates.unlock_target = null;
      updates.campaign_duration_days = null;
      updates.campaign_starts_at = null;
      updates.campaign_ends_at = null;
      updates.greenlit_at = now.toISOString();
      updates.greenlit_by = "manual";
      updates.estimated_delivery_at = estimatedDelivery.toISOString();
      updates.delivery_deadline = estimatedDelivery.toISOString();
      toStatus = "in_production";
      reason = "Creator converted teaser into direct-to-production project";
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[api] teaser convert error:", updateError);
      return NextResponse.json(
        { error: "Failed to convert teaser" },
        { status: 500 }
      );
    }

    const { error: historyError } = await adminSupabase
      .from("project_status_history")
      .insert({
        project_id: id,
        from_status: "teaser",
        to_status: toStatus,
        reason,
        actor_user_id: user.id,
      });

    if (historyError) {
      console.error("[api] teaser convert history error:", historyError);
    }

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
