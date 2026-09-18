import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Fetch project's film video premiere info
    const { data: project } = await supabase
      .from("projects")
      .select("id, film_video_id, lifecycle_status")
      .eq("id", id)
      .single();

    if (!project || !project.film_video_id) {
      return NextResponse.json({ premiere: null });
    }

    const { data: video } = await supabase
      .from("videos")
      .select("is_premiere, premiere_at, premiere_ended, is_premiere_live")
      .eq("id", project.film_video_id)
      .single();

    return NextResponse.json({
      premiere: video
        ? {
            premiere_scheduled_at: video.premiere_at,
            is_premiere_live: video.is_premiere_live ?? false,
            premiere_ended: video.premiere_ended ?? false,
          }
        : null,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-premiere", 10);
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

    // Verify ownership and state
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, film_video_id, lifecycle_status, film_review_status")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.lifecycle_status !== "premiering") {
      return NextResponse.json(
        { error: "Premiere can only be scheduled for projects in premiering state" },
        { status: 400 }
      );
    }

    if (!project.film_video_id) {
      return NextResponse.json(
        { error: "No film delivered yet" },
        { status: 400 }
      );
    }

    // Film must be approved before premiere can be scheduled
    if (project.film_review_status !== "approved") {
      return NextResponse.json(
        { error: "Your film is pending review. You can schedule the premiere after it is approved." },
        { status: 400 }
      );
    }

    let body: { premiere_at?: string; cancel?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Cancel premiere
    if (body.cancel) {
      const { error: cancelError } = await admin
        .from("videos")
        .update({
          is_premiere: false,
          premiere_at: null,
          premiere_scheduled_at: null,
          premiere_ended: false,
          is_premiere_live: false,
          is_published: false,
        })
        .eq("id", project.film_video_id);

      if (cancelError) {
        console.error("[api] cancel premiere error:", cancelError);
        return NextResponse.json({ error: "Failed to cancel premiere" }, { status: 500 });
      }

      return NextResponse.json({ success: true, cancelled: true });
    }

    // Schedule premiere
    if (!body.premiere_at || typeof body.premiere_at !== "string") {
      return NextResponse.json(
        { error: "premiere_at is required (ISO 8601 date string)" },
        { status: 400 }
      );
    }

    const premiereDate = new Date(body.premiere_at);
    if (isNaN(premiereDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Must be at least 48 hours in the future
    const minTime = Date.now() + 48 * 60 * 60 * 1000;
    if (premiereDate.getTime() < minTime) {
      return NextResponse.json(
        { error: "Premiere must be at least 48 hours in the future" },
        { status: 400 }
      );
    }

    // Max 30 days out
    const maxTime = Date.now() + 30 * 24 * 60 * 60 * 1000;
    if (premiereDate.getTime() > maxTime) {
      return NextResponse.json(
        { error: "Premiere cannot be more than 30 days in the future" },
        { status: 400 }
      );
    }

    // Check if this is a reschedule — enforce max 1 reschedule
    const { data: currentVideo } = await supabase
      .from("videos")
      .select("premiere_at, is_premiere")
      .eq("id", project.film_video_id)
      .single();

    if (currentVideo?.premiere_at && currentVideo.is_premiere) {
      // Count previous premiere schedule entries in status history
      const { count: rescheduleCount } = await supabase
        .from("project_status_history")
        .select("id", { count: "exact", head: true })
        .eq("project_id", id)
        .eq("to_status", "premiere_rescheduled");

      if ((rescheduleCount ?? 0) >= 1) {
        return NextResponse.json(
          { error: "Maximum 1 premiere reschedule allowed" },
          { status: 400 }
        );
      }

      // Check if min 24h before original premiere
      const originalPremiere = new Date(currentVideo.premiere_at);
      const hoursUntilOriginal = (originalPremiere.getTime() - Date.now()) / (60 * 60 * 1000);
      if (hoursUntilOriginal < 24) {
        return NextResponse.json(
          { error: "Cannot reschedule within 24 hours of the original premiere time" },
          { status: 400 }
        );
      }
    }

    // Update the video record — also publish it now that premiere is scheduled
    const { error: updateError } = await admin
      .from("videos")
      .update({
        is_premiere: true,
        is_published: true,
        premiere_at: premiereDate.toISOString(),
        premiere_scheduled_at: premiereDate.toISOString(),
        premiere_ended: false,
        is_premiere_live: false,
      })
      .eq("id", project.film_video_id);

    if (updateError) {
      console.error("[api] premiere schedule error:", updateError);
      return NextResponse.json(
        { error: "Failed to schedule premiere" },
        { status: 500 }
      );
    }

    // Log reschedule in status history for tracking
    if (currentVideo?.premiere_at && currentVideo.is_premiere) {
      await admin
        .from("project_status_history")
        .insert({
          project_id: id,
          from_status: "premiere_scheduled",
          to_status: "premiere_rescheduled",
          reason: `Rescheduled from ${currentVideo.premiere_at} to ${premiereDate.toISOString()}`,
          actor_user_id: user.id,
        });
    }

    return NextResponse.json({
      success: true,
      premiere_at: premiereDate.toISOString(),
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
