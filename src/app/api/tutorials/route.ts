import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  fetchTutorialList,
  fetchTutorialForEditor,
  generateUniqueTutorialSlug,
  isTutorialsSchemaCompatError,
  normalizeTutorialCategory,
  normalizeTutorialDifficulty,
  sanitizeTutorialBody,
  sanitizeTutorialTags,
  sanitizeTutorialTitle,
} from "@/lib/tutorials";
import type { TutorialSort } from "@/types/tutorial";

const VALID_SORTS = new Set<TutorialSort>(["popular", "newest", "liked"]);

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("tutorials-list", 90);
    if (rateLimited) return rateLimited;

    const searchParams = request.nextUrl.searchParams;
    const supabase = await createClient();
    const payload = await fetchTutorialList(supabase, {
      q: searchParams.get("q") ?? "",
      category: searchParams.get("category") ?? "general",
      difficulty: searchParams.get("difficulty") ?? "all",
      tag: searchParams.get("tag") ?? "",
      sort: VALID_SORTS.has((searchParams.get("sort") ?? "") as TutorialSort)
        ? (searchParams.get("sort") as TutorialSort)
        : "popular",
      offset: Number(searchParams.get("offset") ?? 0),
      limit: Number(searchParams.get("limit") ?? 24),
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api] tutorials GET error:", error);
    return NextResponse.json({ error: "Failed to load tutorials" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("tutorials-create", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/tutorials", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

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

    const title = sanitizeTutorialTitle(body?.title ?? "");
    const bodyMarkdown = sanitizeTutorialBody(body?.body_markdown ?? "");

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!bodyMarkdown) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    const slug = await generateUniqueTutorialSlug(supabase, title);
    const { data: tutorial, error } = await supabase
      .from("tutorials")
      .insert({
        user_id: user.id,
        title,
        slug,
        body_markdown: bodyMarkdown,
        cover_image_url:
          typeof body?.cover_image_url === "string" && body.cover_image_url.trim().length > 0
            ? body.cover_image_url.trim()
            : null,
        category: normalizeTutorialCategory(body?.category),
        difficulty: normalizeTutorialDifficulty(body?.difficulty),
        tags: sanitizeTutorialTags(body?.tags ?? []),
        is_published: body?.is_published !== false,
      })
      .select(
        "id, user_id, slug, title, body_markdown, cover_image_url, category, difficulty, tags, view_count, like_count, comment_count, is_featured, is_published, created_at, updated_at, profiles!tutorials_user_id_fkey(id, display_name, username, avatar_url)"
      )
      .single();

    if (error) {
      if (!isTutorialsSchemaCompatError(error)) throw error;

      const { data: legacyTutorial, error: legacyError } = await supabase
        .from("tutorials")
        .insert({
          creator_id: user.id,
          title,
          slug,
          body: bodyMarkdown,
          thumbnail_url:
            typeof body?.cover_image_url === "string" && body.cover_image_url.trim().length > 0
              ? body.cover_image_url.trim()
              : "",
          published_at: body?.is_published === false ? null : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (legacyError) throw legacyError;

      const fallbackTutorial = await fetchTutorialForEditor(supabase, legacyTutorial.id, user.id);
      if (!fallbackTutorial) {
        throw new Error("Failed to load created tutorial");
      }

      return NextResponse.json({ tutorial: fallbackTutorial }, { status: 201 });
    }

    return NextResponse.json({ tutorial }, { status: 201 });
  } catch (error) {
    console.error("[api] tutorials POST error:", error);
    return NextResponse.json({ error: "Failed to create tutorial" }, { status: 500 });
  }
}
