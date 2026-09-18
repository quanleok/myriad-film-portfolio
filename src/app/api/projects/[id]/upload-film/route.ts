import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Creates a `videos` table row from a Bunny video GUID uploaded via the inline
 * delivery uploader.  The existing `useVideoUpload` hook only creates the Bunny
 * entry — this endpoint bridges the gap so the deliver API can reference a real
 * video record.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("upload-film", 5);
    if (rateLimited) return rateLimited;

    const { id: projectId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Verify project ownership
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, title, genre, format, lifecycle_status, launch_mode")
      .eq("id", projectId)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only allow film upload in appropriate lifecycle states
    const allowedStates = ["in_production", "premiering"];
    const directModes = ["direct_premiere", "direct_release"];
    if (project.lifecycle_status === "draft" && directModes.includes(project.launch_mode ?? "")) {
      // Allow draft uploads for direct modes (film uploaded before submit)
    } else if (!allowedStates.includes(project.lifecycle_status ?? "")) {
      return NextResponse.json(
        { error: "Film upload is only allowed for projects in production or premiering" },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const bunnyVideoId = body.bunny_video_id;
    if (!bunnyVideoId || typeof bunnyVideoId !== "string") {
      return NextResponse.json(
        { error: "bunny_video_id is required" },
        { status: 400 }
      );
    }

    // Validate bunny_video_id exists in our Bunny library
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const bunnyApiKey = process.env.BUNNY_STREAM_API_KEY;
    if (libraryId && bunnyApiKey) {
      try {
        const bunnyRes = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${bunnyVideoId}`,
          { headers: { AccessKey: bunnyApiKey } }
        );
        if (!bunnyRes.ok) {
          return NextResponse.json(
            { error: "Video not found in CDN" },
            { status: 400 }
          );
        }
      } catch (bunnyErr) {
        console.error("[api] Bunny validation error:", bunnyErr);
        // Don't block on Bunny API failures — log and continue
      }
    }

    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : `${project.title} — Final Film`;

    // Map project format to video content_type
    const formatMap: Record<string, string> = {
      feature: "movie",
      short: "short",
      series: "series",
      music_video: "music_video",
    };
    const contentType = formatMap[project.format ?? ""] ?? "movie";

    // Create a videos table row so the deliver API can reference it
    // Use admin client to bypass RLS — we already verified project ownership above
    const adminSupabase = createAdminClient();
    const { data: video, error: insertError } = await adminSupabase
      .from("videos")
      .insert({
        creator_id: user.id,
        title,
        bunny_video_id: bunnyVideoId,
        bunny_library_id: process.env.BUNNY_STREAM_LIBRARY_ID || null,
        is_published: false,
        visibility: "private",
        pricing_model: "free",
        content_type: contentType,
        genre: project.genre ?? "sci_fi",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[api] upload-film insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to register video" },
        { status: 500 }
      );
    }

    return NextResponse.json({ videoId: video.id });
  } catch (err) {
    console.error("[api] upload-film error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
