import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripHtmlTags } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const seriesType = request.nextUrl.searchParams.get("series_type");

    let query = supabase
      .from("series")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (seriesType) {
      query = query.eq("series_type", seriesType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ series: data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("series-create", 10);
    if (rateLimited) return rateLimited;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_creator")
      .eq("id", user.id)
      .single();

    if (!profile?.is_creator) {
      return NextResponse.json(
        { error: "You must be a creator" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, genre, thumbnail_url, cover_image_url, pricing_model, tags, series_type } = body;

    if (!title || !genre) {
      return NextResponse.json(
        { error: "Title and genre are required" },
        { status: 400 }
      );
    }

    if (typeof title !== "string" || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (description && (typeof description !== "string" || description.length > 5000)) {
      return NextResponse.json(
        { error: "Description must be 5000 characters or less" },
        { status: 400 }
      );
    }

    const sanitizedTitle = stripHtmlTags(title);
    const sanitizedDescription = description ? stripHtmlTags(description) : description;

    const { data, error } = await supabase
      .from("series")
      .insert({
        creator_id: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription || null,
        genre,
        thumbnail_url: thumbnail_url || null,
        cover_image_url: cover_image_url || null,
        pricing_model: pricing_model || "mixed",
        tags: tags || [],
        series_type: series_type || "series",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ series: data }, { status: 201 });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
