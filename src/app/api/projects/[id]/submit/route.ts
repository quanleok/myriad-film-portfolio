import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { indexProjectById } from "@/lib/meilisearch/client";
import { getStripeOnboardingStatus } from "@/lib/stripe/connect";
import {
  FOUNDING_CREATOR_PUBLIC_ENDS_AT,
  FOUNDING_CREATOR_PUBLIC_TEASER_SLOT_LIMIT,
} from "@/lib/founding-program";
import {
  getFoundingProgramStatus,
  grantFoundingCreatorAccess,
} from "@/lib/founding-program-server";
import { getLaunchReadiness } from "@/lib/project-launch-readiness";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isFoundingGrantResult(
  value:
    | Awaited<ReturnType<typeof grantFoundingCreatorAccess>>
    | Awaited<ReturnType<typeof getFoundingProgramStatus>>
    | null
): value is Awaited<ReturnType<typeof grantFoundingCreatorAccess>> {
  return Boolean(value && "awarded" in value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-submit", 5);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Check Stripe Connect onboarding, delivery count, and standing
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, delivered_project_count, creator_good_standing, is_admin")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    if (profile.creator_good_standing === false) {
      return NextResponse.json(
        { error: "Your account is not in good standing. Please resolve any overdue projects before launching new ones." },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Fetch the project and verify ownership
    const { data: project } = await supabase
      .from("projects")
      .select(
        `id, creator_id, lifecycle_status, moderation_status, launch_mode,
         title, hook, synopsis, teaser_asset_id, preorder_price_cents, release_price_cents,
         unlock_target, campaign_duration_days, production_window_days, genre, content_rating,
         film_video_id, format, episode_count, is_test`
      )
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.lifecycle_status !== "draft") {
      return NextResponse.json(
        { error: "Only draft projects can be launched" },
        { status: 400 }
      );
    }

    const launchMode = project.launch_mode || "preorder";
    const isTeaserMode = launchMode === "teaser";
    const isProductionMode = launchMode === "production";
    const isDirectMode =
      launchMode === "direct_premiere" || launchMode === "direct_release";
    const supportsPreorders = launchMode === "preorder" || isProductionMode;
    let stripeReady = Boolean(profile?.stripe_onboarding_complete);

    if (!isTeaserMode && profile?.stripe_account_id && !stripeReady) {
      try {
        stripeReady = await getStripeOnboardingStatus(profile.stripe_account_id);
        if (stripeReady !== Boolean(profile.stripe_onboarding_complete)) {
          await supabase
            .from("profiles")
            .update({ stripe_onboarding_complete: stripeReady })
            .eq("id", user.id);
        }
      } catch (error) {
        console.error("[project-submit] failed to refresh Stripe onboarding:", error);
      }
    }

    if (!isTeaserMode && !stripeReady) {
      return NextResponse.json(
        { error: "Please complete Stripe payout onboarding before submitting" },
        { status: 400 }
      );
    }

    if (!isTeaserMode) {
      // Block launch if creator has any overdue projects
      const { count: overdueCount } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("is_overdue", true);

      if (overdueCount && overdueCount > 0) {
        return NextResponse.json(
          { error: "You have an overdue project. Please deliver it before launching a new one." },
          { status: 403 }
        );
      }

      // Enforce project limits based on delivery record
      const deliveredCount = profile.delivered_project_count ?? 0;
      const maxActive = deliveredCount >= 3 ? Infinity : deliveredCount >= 1 ? 3 : 1;

      if (maxActive !== Infinity) {
        const { count: activeCount } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id)
          .in("lifecycle_status", ["unlocking", "in_production", "premiering"]);

        if ((activeCount ?? 0) >= maxActive) {
          const limitMsg = maxActive === 1
            ? "New creators can only have 1 active project at a time. Deliver your current project first."
            : `You can have up to ${maxActive} active projects. Deliver a current project first.`;
          return NextResponse.json({ error: limitMsg }, { status: 400 });
        }
      }
    }

    const launchReadiness = getLaunchReadiness(
      {
        launchMode,
        title: project.title,
        hook: project.hook,
        synopsis: project.synopsis,
        genre: project.genre,
        contentRating: project.content_rating,
        teaserAssetId: project.teaser_asset_id,
        preorderPriceCents: project.preorder_price_cents,
        unlockTarget: project.unlock_target,
        campaignDurationDays: project.campaign_duration_days,
        productionWindowDays: project.production_window_days,
        releasePriceCents: project.release_price_cents,
        episodeCount: project.episode_count,
        format: project.format,
        filmVideoId: project.film_video_id,
        rightsReady: body.rights_attested === true,
        termsReady: Boolean(body.terms_version),
      },
      { includeCompliance: true }
    );

    if (!launchReadiness.ready) {
      return NextResponse.json(
        {
          error: "Please complete all required fields before submitting",
          missing_fields: launchReadiness.missingFields,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Build update payload based on launch mode
    // Direct modes (direct_premiere, direct_release) go through admin review
    // before lifecycle transition — submit sets pending_review, publish route
    // handles the actual transition + video publishing on approval.
    const updates: Record<string, unknown> = {
      moderation_status: isDirectMode ? "pending_review" : "live",
      visibility: "public",
    };
    const productionWindowDays = project.production_window_days || 60;
    const estimatedDelivery = new Date(now);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + productionWindowDays);

    if (isTeaserMode) {
      updates.lifecycle_status = "teaser";
      updates.preorder_price_cents = null;
      updates.release_price_cents = null;
      updates.unlock_target = null;
      updates.campaign_duration_days = null;
      updates.campaign_starts_at = null;
      updates.campaign_ends_at = null;
      updates.greenlit_at = null;
      updates.greenlit_by = null;
      updates.estimated_delivery_at = null;
      updates.delivery_deadline = null;
      updates.manual_greenlight_eligible = false;
      updates.production_window_days = null;
      updates.preorders_closed_at = null;
      updates.delivered_at = null;
      updates.premiere_date = null;
      updates.film_video_id = null;
    } else if (isDirectMode) {
      // Direct modes: keep lifecycle as draft until admin approves via publish route.
      // Film is already uploaded (validated by readiness check).
      updates.lifecycle_status = "draft";
      updates.film_review_status = "pending";
    } else if (isProductionMode) {
      updates.lifecycle_status = "in_production";
      updates.unlock_target = null;
      updates.campaign_duration_days = null;
      updates.campaign_starts_at = null;
      updates.campaign_ends_at = null;
      updates.greenlit_at = now.toISOString();
      updates.greenlit_by = "manual";
      updates.estimated_delivery_at = estimatedDelivery.toISOString();
      updates.delivery_deadline = estimatedDelivery.toISOString();
      updates.manual_greenlight_eligible = false;
    } else {
      // Standard preorder flow
      const campaignEndsAt = new Date(now);
      campaignEndsAt.setDate(campaignEndsAt.getDate() + (project.campaign_duration_days || 30));
      updates.lifecycle_status = "unlocking";
      updates.campaign_starts_at = now.toISOString();
      updates.campaign_ends_at = campaignEndsAt.toISOString();
    }

    if (body.rights_attested === true) {
      updates.rights_attested_at = now.toISOString();
    }

    if (body.terms_version) {
      updates.creator_terms_version = String(body.terms_version);
    }

    // Update the project
    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[api] project submit error:", updateError);
      return NextResponse.json(
        { error: "Failed to launch project" },
        { status: 500 }
      );
    }

    // Insert status history via admin client (bypasses RLS)
    const toStatus = updates.lifecycle_status as string;
    const reason = launchMode === "preorder"
      ? "Creator launched campaign"
      : launchMode === "teaser"
        ? "Creator posted teaser project"
      : launchMode === "production"
        ? "Creator launched direct-to-production project"
        : launchMode === "direct_premiere"
        ? "Creator submitted direct premiere for review"
        : launchMode === "direct_release"
        ? "Creator submitted direct release for review"
        : "Creator launched project";

    const adminSupabase = createAdminClient();
    const { error: historyError } = await adminSupabase
      .from("project_status_history")
      .insert({
        project_id: id,
        from_status: "draft",
        to_status: toStatus,
        reason,
        actor_user_id: user.id,
      });

    if (historyError) {
      console.error("[api] status history insert error:", historyError);
    }

    // NOTE: direct_release does NOT increment delivered_project_count.
    // "Proven creator" status requires successful preorder delivery + film approval,
    // not just publishing a direct release. This prevents gaming the trust tier.

    let foundingAwardResult:
      | Awaited<ReturnType<typeof grantFoundingCreatorAccess>>
      | Awaited<ReturnType<typeof getFoundingProgramStatus>>
      | null = null;

    if (isTeaserMode) {
      try {
        if (!project.is_test && !profile.is_admin) {
          foundingAwardResult = await grantFoundingCreatorAccess({
            userId: user.id,
            source: "teaser_auto",
            qualifyingProjectId: id,
          });
        } else {
          foundingAwardResult = await getFoundingProgramStatus(user.id);
        }
      } catch (awardError) {
        console.error("[project-submit] founding creator auto-award failed:", awardError);

        try {
          foundingAwardResult = await getFoundingProgramStatus(user.id);
        } catch (statusError) {
          console.error("[project-submit] founding creator status fallback failed:", statusError);
        }
      }
    }

    // Index to Meilisearch (now live and discoverable)
    indexProjectById(id);

    const foundingAwarded = isFoundingGrantResult(foundingAwardResult)
      ? foundingAwardResult.awarded
      : false;
    const slotNumber = isFoundingGrantResult(foundingAwardResult)
      ? foundingAwardResult.slotNumber
      : foundingAwardResult?.currentUserSlotNumber ?? null;

    return NextResponse.json({
      project: updated,
      ...(isTeaserMode
        ? {
            foundingAwarded,
            foundingAlreadyActive: Boolean(foundingAwardResult?.currentUserIsFounding),
            slotNumber,
            claimedSlots: foundingAwardResult?.claimedTeaserSlots ?? 0,
            remainingSlots:
              foundingAwardResult?.remainingTeaserSlots ??
              FOUNDING_CREATOR_PUBLIC_TEASER_SLOT_LIMIT,
            publicEndsAt: foundingAwardResult?.publicEndsAt ?? FOUNDING_CREATOR_PUBLIC_ENDS_AT,
            publicProgramOpen: Boolean(foundingAwardResult?.publicProgramOpen),
          }
        : {}),
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
