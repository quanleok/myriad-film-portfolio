import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchTutorialComments, isTutorialsSchemaCompatError } from "@/lib/tutorials";

async function resolveTutorialId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tutorialRef: string
) {
  try {
    const query = supabase
      .from("tutorials")
      .select("id, user_id, is_published, comment_count")
      .eq(/^[0-9a-f-]{36}$/i.test(tutorialRef) ? "id" : "slug", tutorialRef)
      .maybeSingle();

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    if (!isTutorialsSchemaCompatError(error)) {
      throw error;
    }

    const { data, error: legacyError } = await supabase
      .from("tutorials")
      .select("id, creator_id, published_at")
      .eq(/^[0-9a-f-]{36}$/i.test(tutorialRef) ? "id" : "slug", tutorialRef)
      .maybeSingle();

    if (legacyError) throw legacyError;
    if (!data) return null;

    return {
      id: data.id,
      user_id: data.creator_id,
      is_published: Boolean(data.published_at),
      comment_count: 0,
    };
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tutorial: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("tutorial-comments-list", 120);
    if (rateLimited) return rateLimited;

    const { tutorial: tutorialRef } = await params;
    const supabase = await createClient();
    const tutorial = await resolveTutorialId(supabase, tutorialRef);

    if (!tutorial) {
      return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
    }

    const comments = await fetchTutorialComments(supabase, tutorial.id);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("[api] tutorial comments GET error:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tutorial: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("tutorial-comments-create", 60);
    if (rateLimited) return rateLimited;

    const { tutorial: tutorialRef } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/tutorials/${tutorialRef}/comments`, "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const tutorial = await resolveTutorialId(supabase, tutorialRef);
    if (!tutorial) {
      return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | { body?: string; parent_id?: string | null }
      | null;

    const commentBody = String(body?.body ?? "").trim();
    if (!commentBody) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }

    if (commentBody.length > 4000) {
      return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
    }

    let inserted: unknown;

    try {
      const { data, error } = await supabase
        .from("tutorial_comments")
        .insert({
          tutorial_id: tutorial.id,
          user_id: user.id,
          parent_id: body?.parent_id ?? null,
          body: commentBody,
        })
        .select(
          "id, tutorial_id, user_id, parent_id, body, like_count, created_at, profiles!tutorial_comments_user_id_fkey(id, display_name, username, avatar_url)"
        )
        .single();

      if (error) throw error;
      inserted = data;
    } catch (error) {
      if (isTutorialsSchemaCompatError(error)) {
        return NextResponse.json(
          { error: "Apply the tutorials forum migration to enable comments." },
          { status: 503 }
        );
      }

      throw error;
    }

    try {
      const admin = createAdminClient();
      await admin
        .from("tutorials")
        .update({ comment_count: Math.max((tutorial as { comment_count?: number }).comment_count ?? 0, 0) + 1 })
        .eq("id", tutorial.id);
    } catch (error) {
      if (!isTutorialsSchemaCompatError(error)) {
        throw error;
      }
    }

    return NextResponse.json({ comment: inserted }, { status: 201 });
  } catch (error) {
    console.error("[api] tutorial comments POST error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
