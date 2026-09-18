import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-like", 30);
    if (rateLimited) return rateLimited;

    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Check if user already liked this project
    const { data: existing, error: existingError } = await supabase
      .from("project_likes")
      .select("id")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    if (existing) {
      // Unlike — remove the like
      const { error } = await supabase
        .from("project_likes")
        .delete()
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ liked: false });
    }

    // Like — insert new like
    const { error } = await supabase
      .from("project_likes")
      .insert({ project_id: id, user_id: user.id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // like_count_cache is updated by database trigger
    return NextResponse.json({ liked: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
