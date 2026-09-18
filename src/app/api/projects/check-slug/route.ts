import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("check-slug", 30);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const exclude = searchParams.get("exclude");

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "slug parameter is required" },
        { status: 400 }
      );
    }

    const normalized = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (normalized.length < 3 || normalized.length > 60) {
      return NextResponse.json({
        available: false,
        reason: "Slug must be 3–60 characters",
      });
    }

    let query = supabase
      .from("projects")
      .select("id")
      .eq("slug", normalized);

    if (exclude) {
      query = query.neq("id", exclude);
    }

    const { data: existing } = await query.maybeSingle();

    return NextResponse.json({
      available: !existing,
      slug: normalized,
    });
  } catch (err) {
    console.error("[api] check-slug error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
