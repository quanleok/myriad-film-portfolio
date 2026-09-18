import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReadPrivateProject, getProjectAccessContext } from "@/lib/projects/team";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { stripHtmlTags } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const adminSupabase = createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, creator_id, moderation_status")
      .eq("id", id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.moderation_status !== "live") {
      if (!user) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const access = await getProjectAccessContext(project.id, user.id);
      if (!canReadPrivateProject(access)) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    // Fetch updates with social fields, pinned first then newest
    const { data: updates, error } = await adminSupabase
      .from("project_updates")
      .select(
        "id, project_id, creator_id, update_type, title, body, media_asset_id, is_progress_proof, review_status, is_pinned, like_count_cache, comment_count_cache, created_at"
      )
      .eq("project_id", id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api] fetch updates error:", error);
      return NextResponse.json(
        { error: "Failed to fetch updates" },
        { status: 500 }
      );
    }

    let creator: { avatar_url: string | null; display_name: string | null; username: string | null } | null = null;
    if (project) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("avatar_url, display_name, username")
        .eq("id", project.creator_id)
        .single();
      creator = profile ?? null;
    }

    // Check if authenticated user has liked any updates
    let userLikedUpdateIds: string[] = [];
    if (user && updates && updates.length > 0) {
      const updateIds = updates.map((u: { id: string }) => u.id);
      const { data: likes } = await adminSupabase
        .from("project_update_likes")
        .select("update_id")
        .eq("user_id", user.id)
        .in("update_id", updateIds);
      if (likes) {
        userLikedUpdateIds = likes.map((l: { update_id: string }) => l.update_id);
      }
    }

    return NextResponse.json({ updates: updates ?? [], creator, userLikedUpdateIds });
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
    const rateLimited = await checkRateLimit("project-update", 10);
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

    // Verify the user is the creator and project is in a valid state
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (
      !["unlocking", "in_production", "premiering"].includes(
        project.lifecycle_status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Updates can only be posted for projects that are unlocking, in production, or premiering",
        },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const updateType = body.update_type;
    const validTypes = ["text", "image", "video", "progress_proof"];
    if (!updateType || !validTypes.includes(String(updateType))) {
      return NextResponse.json(
        { error: "update_type must be one of: text, image, video, progress_proof" },
        { status: 400 }
      );
    }

    // Validate title
    let title: string | null = null;
    if (body.title) {
      title = stripHtmlTags(String(body.title).trim());
      if (title.length > 200) {
        return NextResponse.json(
          { error: "Title must be 200 characters or less" },
          { status: 400 }
        );
      }
    }

    // Validate body
    let updateBody: string | null = null;
    if (body.body) {
      updateBody = stripHtmlTags(String(body.body).trim());
      if (updateBody.length > 5000) {
        return NextResponse.json(
          { error: "Body must be 5000 characters or less" },
          { status: 400 }
        );
      }
    }

    const mediaAssetId =
      body.media_asset_id && typeof body.media_asset_id === "string"
        ? body.media_asset_id
        : null;

    const isProgressProof = updateType === "progress_proof";
    const isPinned = body.is_pinned === true;

    // If pinning this update, unpin all others for this project first
    if (isPinned) {
      const adminSupabase = createAdminClient();
      await adminSupabase
        .from("project_updates")
        .update({ is_pinned: false })
        .eq("project_id", id)
        .eq("is_pinned", true);
    }

    const insertPayload: Record<string, unknown> = {
      project_id: id,
      creator_id: user.id,
      update_type: String(updateType),
      title,
      body: updateBody,
      media_asset_id: mediaAssetId,
      is_progress_proof: isProgressProof,
      review_status: isProgressProof ? "pending" : null,
      is_pinned: isPinned,
    };

    const { data, error } = await supabase
      .from("project_updates")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[api] create update error:", error);
      return NextResponse.json(
        { error: "Failed to create update" },
        { status: 500 }
      );
    }

    return NextResponse.json({ update: data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
