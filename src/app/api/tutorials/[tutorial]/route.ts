import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  fetchTutorialBySlug,
  fetchTutorialComments,
  fetchTutorialForEditor,
  generateUniqueTutorialSlug,
  isTutorialsSchemaCompatError,
  mapTutorialDetail,
  normalizeTutorialCategory,
  normalizeTutorialDifficulty,
  sanitizeTutorialBody,
  sanitizeTutorialTags,
  sanitizeTutorialTitle,
} from "@/lib/tutorials";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getViewerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tutorial: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("tutorials-detail", 120);
    if (rateLimited) return rateLimited;

    const { tutorial: tutorialRef } = await params;
    const { supabase, user } = await getViewerId();
    try {
      const tutorialQuery = supabase
        .from("tutorials")
        .select(
          "id, user_id, slug, title, body_markdown, cover_image_url, category, difficulty, tags, view_count, like_count, comment_count, is_featured, is_published, created_at, updated_at, profiles!tutorials_user_id_fkey(id, display_name, username, avatar_url)"
        );

      const { data, error } = UUID_PATTERN.test(tutorialRef)
        ? await tutorialQuery.eq("id", tutorialRef).maybeSingle()
        : await tutorialQuery.eq("slug", tutorialRef).maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
      }

      const [likesData, comments] = await Promise.all([
        user
          ? supabase
              .from("tutorial_likes")
              .select("tutorial_id")
              .eq("tutorial_id", data.id)
              .eq("user_id", user.id)
              .limit(1)
          : Promise.resolve({ data: [], error: null }),
        fetchTutorialComments(supabase, data.id),
      ]);

      if (likesData.error) throw likesData.error;

      return NextResponse.json({
        tutorial: mapTutorialDetail(data, likesData.data ?? []),
        comments,
      });
    } catch (error) {
      if (!isTutorialsSchemaCompatError(error)) {
        throw error;
      }

      const legacyQuery = supabase
        .from("tutorials")
        .select(
          "id, creator_id, slug, title, body, thumbnail_url, published_at, created_at, updated_at, profiles!tutorials_creator_id_fkey(id, display_name, username, avatar_url)"
        );

      const { data: legacyData, error: legacyError } = UUID_PATTERN.test(tutorialRef)
        ? await legacyQuery.eq("id", tutorialRef).maybeSingle()
        : await legacyQuery.eq("slug", tutorialRef).maybeSingle();

      if (legacyError) throw legacyError;
      if (!legacyData) {
        return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
      }

      const tutorial = await fetchTutorialBySlug(supabase, legacyData.slug, user?.id ?? null);

      if (!tutorial) {
        return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
      }

      return NextResponse.json({
        tutorial,
        comments: [],
      });
    }
  } catch (error) {
    console.error("[api] tutorial detail GET error:", error);
    return NextResponse.json({ error: "Failed to load tutorial" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tutorial: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("tutorials-update", 30);
    if (rateLimited) return rateLimited;

    const { tutorial: tutorialRef } = await params;
    const { supabase, user } = await getViewerId();

    if (!user) {
      logFailedAuth(`/api/tutorials/${tutorialRef}`, "PATCH");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const existing = await fetchTutorialForEditor(supabase, tutorialRef, user.id);
    if (!existing) {
      return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          title?: string;
          body_markdown?: string;
          cover_image_url?: string | null;
          category?: string;
          difficulty?: string;
          tags?: unknown;
          is_published?: boolean;
        }
      | null;

    const nextTitle = sanitizeTutorialTitle(body?.title ?? existing.title);
    const nextBody = sanitizeTutorialBody(body?.body_markdown ?? existing.body_markdown);

    if (!nextTitle) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!nextBody) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    const slug =
      nextTitle !== existing.title
        ? await generateUniqueTutorialSlug(supabase, nextTitle, existing.id)
        : existing.slug;

    const { data: tutorial, error } = await supabase
      .from("tutorials")
      .update({
        title: nextTitle,
        slug,
        body_markdown: nextBody,
        cover_image_url:
          typeof body?.cover_image_url === "string" && body.cover_image_url.trim().length > 0
            ? body.cover_image_url.trim()
            : body?.cover_image_url === null
              ? null
              : existing.cover_image_url,
        category: normalizeTutorialCategory(body?.category ?? existing.category),
        difficulty: normalizeTutorialDifficulty(body?.difficulty ?? existing.difficulty),
        tags: sanitizeTutorialTags(body?.tags ?? existing.tags),
        is_published: typeof body?.is_published === "boolean" ? body.is_published : existing.is_published,
      })
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select(
        "id, user_id, slug, title, body_markdown, cover_image_url, category, difficulty, tags, view_count, like_count, comment_count, is_featured, is_published, created_at, updated_at, profiles!tutorials_user_id_fkey(id, display_name, username, avatar_url)"
      )
      .single();

    if (error) {
      if (!isTutorialsSchemaCompatError(error)) throw error;

      const { error: legacyError } = await supabase
        .from("tutorials")
        .update({
          title: nextTitle,
          slug,
          body: nextBody,
          thumbnail_url:
            typeof body?.cover_image_url === "string" && body.cover_image_url.trim().length > 0
              ? body.cover_image_url.trim()
              : body?.cover_image_url === null
                ? ""
                : existing.cover_image_url ?? "",
          published_at:
            typeof body?.is_published === "boolean"
              ? body.is_published
                ? new Date().toISOString()
                : null
              : existing.is_published
                ? new Date().toISOString()
                : null,
        })
        .eq("id", existing.id)
        .eq("creator_id", user.id);

      if (legacyError) throw legacyError;

      const fallbackTutorial = await fetchTutorialForEditor(supabase, existing.id, user.id);
      if (!fallbackTutorial) {
        throw new Error("Failed to load updated tutorial");
      }

      return NextResponse.json({ tutorial: fallbackTutorial });
    }

    return NextResponse.json({ tutorial: mapTutorialDetail(tutorial) });
  } catch (error) {
    console.error("[api] tutorial PATCH error:", error);
    return NextResponse.json({ error: "Failed to update tutorial" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tutorial: string }> }
) {
  try {
    const rateLimited = await checkRateLimit("tutorials-delete", 20);
    if (rateLimited) return rateLimited;

    const { tutorial: tutorialRef } = await params;
    const { supabase, user } = await getViewerId();

    if (!user) {
      logFailedAuth(`/api/tutorials/${tutorialRef}`, "DELETE");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tutorial = await fetchTutorialForEditor(supabase, tutorialRef, user.id);
    if (!tutorial) {
      return NextResponse.json({ error: "Tutorial not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("tutorials")
      .delete()
      .eq("id", tutorial.id)
      .eq("user_id", user.id);

    if (error) {
      if (!isTutorialsSchemaCompatError(error)) throw error;

      const { error: legacyError } = await supabase
        .from("tutorials")
        .delete()
        .eq("id", tutorial.id)
        .eq("creator_id", user.id);

      if (legacyError) throw legacyError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] tutorial DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete tutorial" }, { status: 500 });
  }
}
