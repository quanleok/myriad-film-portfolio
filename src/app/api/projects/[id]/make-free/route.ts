import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { indexProjectById } from "@/lib/meilisearch/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-make-free", 10);
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

    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status, release_option, release_price_cents, film_video_id")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.lifecycle_status !== "released") {
      return NextResponse.json(
        { error: "Only released films can be made free" },
        { status: 400 }
      );
    }

    if (project.release_option === "free" || !project.release_price_cents) {
      return NextResponse.json(
        { error: "This film is already free to watch" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const videoIds = new Set<string>();

    if (project.film_video_id) {
      videoIds.add(project.film_video_id);
    }

    const { data: episodeRows, error: episodeError } = await admin
      .from("project_episodes")
      .select("video_id")
      .eq("project_id", id);

    if (episodeError) {
      console.error("[api] make-free episode lookup error:", episodeError);
      return NextResponse.json(
        { error: "Failed to update release pricing" },
        { status: 500 }
      );
    }

    for (const row of episodeRows ?? []) {
      if (row.video_id) {
        videoIds.add(row.video_id);
      }
    }

    const videoIdList = Array.from(videoIds);

    if (videoIdList.length > 0) {
      const { error: videoUpdateError } = await admin
        .from("videos")
        .update({
          pricing_model: "free",
          price_cents: null,
          is_premium: false,
        })
        .in("id", videoIdList);

      if (videoUpdateError) {
        console.error("[api] make-free video update error:", videoUpdateError);
        return NextResponse.json(
          { error: "Failed to update film access" },
          { status: 500 }
        );
      }
    }

    const { data: updatedProject, error: projectUpdateError } = await admin
      .from("projects")
      .update({
        release_option: "free",
        release_price_cents: null,
        purchase_price_cents: null,
      })
      .eq("id", id)
      .eq("creator_id", user.id)
      .select("id, release_option, release_price_cents, purchase_price_cents")
      .single();

    if (projectUpdateError) {
      console.error("[api] make-free project update error:", projectUpdateError);

      if (videoIdList.length > 0) {
        await admin
          .from("videos")
          .update({
            pricing_model: "premium",
            price_cents: project.release_price_cents,
            is_premium: true,
          })
          .in("id", videoIdList);
      }

      return NextResponse.json(
        { error: "Failed to update release pricing" },
        { status: 500 }
      );
    }

    indexProjectById(id);

    return NextResponse.json({ project: updatedProject });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
