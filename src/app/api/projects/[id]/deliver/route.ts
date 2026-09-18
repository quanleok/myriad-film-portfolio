import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { sendFilmDeliveredEmail } from "@/lib/email/send";
import { indexProjectById } from "@/lib/meilisearch/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-deliver", 5);
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

    // Fetch the project and verify ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status, film_video_id, title, slug, release_price_cents, preorder_price_cents, launch_mode, format, episode_count, production_progress")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isReplacement = project.lifecycle_status === "premiering";

    // Idempotency: prevent double-delivery (unless replacing film before premiere)
    if (!isReplacement && project.film_video_id) {
      return NextResponse.json(
        { error: "Film has already been delivered" },
        { status: 409 }
      );
    }

    if (project.lifecycle_status !== "in_production" && !isReplacement) {
      return NextResponse.json(
        { error: "Only projects in production can be delivered" },
        { status: 400 }
      );
    }

    // Require 100% production progress before first delivery
    if (!isReplacement && (project.production_progress ?? 0) < 100) {
      return NextResponse.json(
        { error: "Production progress must be at 100% before delivering" },
        { status: 400 }
      );
    }

    // File replacement: only allowed before premiere starts
    if (isReplacement && project.film_video_id) {
      const { data: existingVideo } = await supabase
        .from("videos")
        .select("is_premiere_live, premiere_ended")
        .eq("id", project.film_video_id)
        .single();

      if (existingVideo?.is_premiere_live || existingVideo?.premiere_ended) {
        return NextResponse.json(
          { error: "Cannot replace film after premiere has started" },
          { status: 400 }
        );
      }
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── Series delivery: multi-episode handling ──
    const isSeries = project.format === "series" && project.episode_count;

    if (isSeries) {
      const episodes = body.episodes;
      if (!Array.isArray(episodes) || episodes.length !== project.episode_count) {
        return NextResponse.json(
          { error: `Series requires exactly ${project.episode_count} episodes` },
          { status: 400 }
        );
      }

      const nowDate = new Date();
      const minPremiereDate = new Date(nowDate.getTime() + 48 * 60 * 60 * 1000);
      const maxPremiereDate = new Date(nowDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      for (const ep of episodes) {
        if (!ep.episode_number || typeof ep.episode_number !== "number") {
          return NextResponse.json(
            { error: "Each episode must have a numeric episode_number" },
            { status: 400 }
          );
        }
        if (!ep.video_id || typeof ep.video_id !== "string") {
          return NextResponse.json(
            { error: `Episode ${ep.episode_number}: video_id is required` },
            { status: 400 }
          );
        }
        if (!ep.title || typeof ep.title !== "string" || ep.title.length > 200) {
          return NextResponse.json(
            { error: `Episode ${ep.episode_number}: title is required (max 200 chars)` },
            { status: 400 }
          );
        }
        if (!ep.premiere_scheduled_at) {
          return NextResponse.json(
            { error: `Episode ${ep.episode_number}: premiere_scheduled_at is required` },
            { status: 400 }
          );
        }
        const premiereDate = new Date(ep.premiere_scheduled_at);
        if (isNaN(premiereDate.getTime()) || premiereDate < minPremiereDate || premiereDate > maxPremiereDate) {
          return NextResponse.json(
            { error: `Episode ${ep.episode_number}: premiere must be between 48 hours and 1 year from now` },
            { status: 400 }
          );
        }

        // Validate video ownership
        const { data: epVideo } = await supabase
          .from("videos")
          .select("id, creator_id")
          .eq("id", ep.video_id)
          .single();

        if (!epVideo || epVideo.creator_id !== user.id) {
          return NextResponse.json(
            { error: `Episode ${ep.episode_number}: video not found or not yours` },
            { status: 403 }
          );
        }
      }

      // Sort by episode_number
      episodes.sort((a: { episode_number: number }, b: { episode_number: number }) => a.episode_number - b.episode_number);

      // Validate premiere dates are chronological and at least 24h apart
      for (let i = 1; i < episodes.length; i++) {
        const prev = new Date(episodes[i - 1].premiere_scheduled_at);
        const curr = new Date(episodes[i].premiere_scheduled_at);
        if (curr <= prev) {
          return NextResponse.json(
            { error: `Episode ${episodes[i].episode_number}: premiere must be after episode ${episodes[i - 1].episode_number}` },
            { status: 400 }
          );
        }
        if (curr.getTime() - prev.getTime() < 24 * 60 * 60 * 1000) {
          return NextResponse.json(
            { error: "Episodes must be at least 24 hours apart" },
            { status: 400 }
          );
        }
      }

      // Use first episode's video as film_video_id for backward compat
      body.film_video_id = episodes[0].video_id;
    }

    const filmVideoId = body.film_video_id;
    if (!filmVideoId || typeof filmVideoId !== "string") {
      return NextResponse.json(
        { error: "film_video_id is required" },
        { status: 400 }
      );
    }

    // Optional: creator can adjust release price at delivery time
    let effectiveReleasePrice = project.release_price_cents;
    if (body.release_price_cents !== undefined) {
      const newPrice = body.release_price_cents;
      if (typeof newPrice !== "number" || !Number.isInteger(newPrice) || newPrice < 300 || newPrice > 20000) {
        return NextResponse.json(
          { error: "release_price_cents must be an integer between 300 and 20000 ($3–$200)" },
          { status: 400 }
        );
      }
      // Preorder-backed projects cannot undercut the preorder price at release
      if (
        (project.launch_mode === "preorder" || project.launch_mode === "production") &&
        project.preorder_price_cents &&
        newPrice < project.preorder_price_cents
      ) {
        return NextResponse.json(
          { error: `Release price must be at least the preorder price ($${(project.preorder_price_cents / 100).toFixed(2)})` },
          { status: 400 }
        );
      }
      effectiveReleasePrice = newPrice;
    }

    // Validate the video exists and belongs to the creator
    const { data: video } = await supabase
      .from("videos")
      .select("id, creator_id")
      .eq("id", filmVideoId)
      .single();

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    if (video.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Video does not belong to you" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // Update the project — use effective release price (may be adjusted at delivery)
    // Film goes to pending review — admin must approve before premiere/payout
    const projectUpdate: Record<string, unknown> = {
      delivered_at: now,
      film_video_id: filmVideoId,
      release_option: "premium_purchase",
      release_price_cents: effectiveReleasePrice,
      purchase_price_cents: effectiveReleasePrice,
      film_review_status: "pending",
    };
    if (!isReplacement) {
      projectUpdate.lifecycle_status = "premiering";
    }

    const { data: updated, error: updateError } = await supabase
      .from("projects")
      .update(projectUpdate)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[api] project deliver error:", updateError);
      return NextResponse.json(
        { error: "Failed to deliver project" },
        { status: 500 }
      );
    }

    // NOTE: Payout release, held balance release, and delivered_count increment
    // are now handled by admin approve_film action (moderate route).
    // Film must be reviewed and approved before any funds are released.
    const adminSupabase = createAdminClient();

    // Grant entitlements to all committed preorder holders
    const { data: committedPreorders } = await adminSupabase
      .from("project_preorders")
      .select("user_id")
      .eq("project_id", id)
      .eq("current_status", "committed");

    if (committedPreorders && committedPreorders.length > 0) {
      const entitlements = committedPreorders.map((p: { user_id: string }) => ({
        project_id: id,
        user_id: p.user_id,
        video_id: filmVideoId,
        source_type: "preorder" as const,
        granted_at: now,
      }));

      const { error: entitlementError } = await adminSupabase
        .from("project_entitlements")
        .upsert(entitlements, { onConflict: "project_id,user_id" });

      if (entitlementError) {
        console.error("[api] entitlement creation error:", entitlementError);
      }
    }

    // Email all backers about film delivery
    if (committedPreorders && committedPreorders.length > 0) {
      try {
        const backerIds = [...new Set(committedPreorders.map((p: { user_id: string }) => p.user_id))];
        const { data: backerProfiles } = await adminSupabase
          .from("profiles")
          .select("email")
          .in("id", backerIds);

        if (backerProfiles) {
          for (const backer of backerProfiles) {
            if (backer.email) {
              await sendFilmDeliveredEmail(
                backer.email,
                project.title,
                project.slug,
                filmVideoId as string
              );
            }
          }
        }
      } catch (emailErr) {
        console.error("[api] film delivered email error:", emailErr);
      }
    }

    // Update video pricing — keep unpublished until premiere is scheduled
    // This prevents backers from watching before the creator sets a premiere date.
    // The premiere route will publish the video when a premiere date is set.
    const videoUpdate: Record<string, unknown> = {
      is_published: false,
      pricing_model: effectiveReleasePrice ? "premium" : "free",
      price_cents: effectiveReleasePrice || null,
    };

    const { error: videoUpdateError } = await adminSupabase
      .from("videos")
      .update(videoUpdate)
      .eq("id", filmVideoId);

    if (videoUpdateError) {
      console.error("[api] video pricing update error:", videoUpdateError);
    }

    // ── Series: insert episodes + set premiere on each video ──
    if (isSeries && body.episodes) {
      const episodes = body.episodes as Array<{
        episode_number: number;
        title: string;
        video_id: string;
        premiere_scheduled_at: string;
      }>;

      const episodeRows = episodes.map((ep) => ({
        project_id: id,
        episode_number: ep.episode_number,
        title: ep.title,
        video_id: ep.video_id,
        premiere_scheduled_at: ep.premiere_scheduled_at,
      }));

      const { error: episodeError } = await adminSupabase
        .from("project_episodes")
        .upsert(episodeRows, { onConflict: "project_id,episode_number" });

      if (episodeError) {
        console.error("[api] episode insert error:", episodeError);
      }

      // Set premiere on each episode video — NOT published until admin approves (film_review_status)
      for (const ep of episodes) {
        await adminSupabase
          .from("videos")
          .update({
            is_premiere: true,
            premiere_at: ep.premiere_scheduled_at,
            premiere_scheduled_at: ep.premiere_scheduled_at,
            is_published: false,
            pricing_model: effectiveReleasePrice ? "premium" : "free",
            price_cents: effectiveReleasePrice || null,
          })
          .eq("id", ep.video_id);
      }
    }

    // Insert status history
    if (!isReplacement) {
      const { error: historyError } = await adminSupabase
        .from("project_status_history")
        .insert({
          project_id: id,
          from_status: "in_production",
          to_status: "premiering",
          reason: isSeries
            ? `Creator delivered series (${project.episode_count} episodes)`
            : "Creator delivered the final film",
          actor_user_id: user.id,
        });

      if (historyError) {
        console.error("[api] status history insert error:", historyError);
      }
    }

    // Reindex (status changed to premiering)
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
