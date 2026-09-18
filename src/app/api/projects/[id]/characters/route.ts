import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canReadPrivateProject, getProjectAccessContext } from "@/lib/projects/team";
import { checkRateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Check project exists and is accessible
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, creator_id, moderation_status")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Allow public access for live projects; otherwise require ownership
    if (project.moderation_status !== "live") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      const access = await getProjectAccessContext(id, user.id);
      if (!canReadPrivateProject(access)) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }

    const { data: characters, error } = await supabase
      .from("project_character_cards")
      .select(
        "id, sort_order, name, short_description, media_asset_id, media_type, video_asset_id"
      )
      .eq("project_id", id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[api] character cards fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch character cards" },
        { status: 500 }
      );
    }

    return NextResponse.json({ characters: characters ?? [] });
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
    const rateLimited = await checkRateLimit("project-characters", 20);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership and draft status
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!["draft", "unlocking", "in_production"].includes(project.lifecycle_status)) {
      return NextResponse.json(
        { error: "Character cards can only be edited before release" },
        { status: 400 }
      );
    }

    let body: { cards?: Array<{
      id?: string;
      name: string;
      short_description?: string;
      media_asset_id?: string;
      media_type?: "image" | "video";
      video_asset_id?: string;
      sort_order: number;
    }> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { cards } = body;

    if (!Array.isArray(cards)) {
      return NextResponse.json(
        { error: "cards must be an array" },
        { status: 400 }
      );
    }

    if (cards.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 character cards per project" },
        { status: 400 }
      );
    }

    // Validate each card
    for (const card of cards) {
      if (!card.name || typeof card.name !== "string") {
        return NextResponse.json(
          { error: "Each character card must have a name" },
          { status: 400 }
        );
      }

      if (card.name.trim().length === 0 || card.name.trim().length > 100) {
        return NextResponse.json(
          { error: "Character name must be between 1 and 100 characters" },
          { status: 400 }
        );
      }

      if (
        card.short_description &&
        typeof card.short_description === "string" &&
        card.short_description.length > 500
      ) {
        return NextResponse.json(
          { error: "Short description must be 500 characters or less" },
          { status: 400 }
        );
      }
    }

    // Delete existing cards for this project, then insert all new ones
    const { error: deleteError } = await supabase
      .from("project_character_cards")
      .delete()
      .eq("project_id", id);

    if (deleteError) {
      console.error("[api] character cards delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to update character cards" },
        { status: 500 }
      );
    }

    if (cards.length === 0) {
      return NextResponse.json({ characters: [] });
    }

    const rows = cards.map((card) => ({
      project_id: id,
      name: card.name.trim(),
      short_description: card.short_description?.trim() || null,
      media_asset_id: card.media_asset_id || null,
      media_type: card.media_type || null,
      video_asset_id: card.video_asset_id || null,
      sort_order: card.sort_order,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("project_character_cards")
      .insert(rows)
      .select(
        "id, sort_order, name, short_description, media_asset_id, media_type, video_asset_id"
      );

    if (insertError) {
      console.error("[api] character cards insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save character cards" },
        { status: 500 }
      );
    }

    return NextResponse.json({ characters: inserted ?? [] });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
