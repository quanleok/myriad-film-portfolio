import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/series/[id]/reorder — reorder episodes by providing ordered IDs
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const rateLimited = await checkRateLimit("series-reorder", 20);
  if (rateLimited) return rateLimited;
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: series } = await supabase
    .from("series")
    .select("creator_id")
    .eq("id", id)
    .single();

  if (!series || series.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { episodeIds } = body as { episodeIds: unknown[] };

  if (!Array.isArray(episodeIds) || episodeIds.length === 0) {
    return NextResponse.json(
      { error: "episodeIds array is required" },
      { status: 400 }
    );
  }

  if (episodeIds.length > 500) {
    return NextResponse.json(
      { error: "episodeIds array exceeds maximum of 500" },
      { status: 400 }
    );
  }

  if (episodeIds.some((eid) => typeof eid !== "string" || eid.length === 0)) {
    return NextResponse.json(
      { error: "Each episodeId must be a non-empty string" },
      { status: 400 }
    );
  }

  // Deduplicate while preserving order
  const uniqueEpisodeIds = [...new Set(episodeIds as string[])];

  // Update episode_number for each video in the order provided
  const updates = uniqueEpisodeIds.map((videoId, index) =>
    supabase
      .from("videos")
      .update({ episode_number: index + 1 })
      .eq("id", videoId)
      .eq("series_id", id)
  );

  try {
    const results = await Promise.allSettled(updates);
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error("Some reorder updates failed:", failures);
      return NextResponse.json(
        {
          error: `${failures.length} of ${uniqueEpisodeIds.length} updates failed`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Reorder failed:", error);
    return NextResponse.json(
      { error: "Failed to reorder episodes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
