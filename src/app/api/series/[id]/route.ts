import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripHtmlTags } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("series")
      .select(
        `
      *,
      profiles!series_creator_id_fkey (
        id,
        display_name,
        username,
        avatar_url,
        subscriber_count,
        subscription_price_cents
      )
    `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    // Fetch episodes — explicit columns, exclude bunny_video_id/bunny_library_id
    const { data: episodes } = await supabase
      .from("videos")
      .select(
        `id, title, description, thumbnail_url, genre, content_type,
       pricing_model, price_cents, is_premium, is_published,
       duration_seconds, view_count, like_count, comment_count,
       season_number, episode_number, series_id, creator_id,
       tags, published_at, created_at, preview_seconds`
      )
      .eq("series_id", id)
      .order("season_number", { ascending: true })
      .order("episode_number", { ascending: true });

    return NextResponse.json({ series: data, episodes: episodes ?? [] });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimited = await checkRateLimit("series-edit", 20);
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
    const { data: existing } = await supabase
      .from("series")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (!existing || existing.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if ("title" in body && (typeof body.title !== "string" || body.title.length > 200)) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }

    if ("description" in body && body.description && (typeof body.description !== "string" || body.description.length > 5000)) {
      return NextResponse.json(
        { error: "Description must be 5000 characters or less" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "title",
      "description",
      "genre",
      "thumbnail_url",
      "cover_image_url",
      "is_published",
      "season_count",
      "pricing_model",
      "tags",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = field === "title" && typeof body[field] === "string"
          ? stripHtmlTags(body[field])
          : field === "description" && typeof body[field] === "string"
          ? stripHtmlTags(body[field])
          : body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("series")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ series: data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimited = await checkRateLimit("series-delete", 10);
    if (rateLimited) return rateLimited;
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from("series")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (!existing || existing.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow deletion if series has no episodes
    const { count } = await supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("series_id", id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Cannot delete series with episodes. Remove all episodes first." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("series").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
