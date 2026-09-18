import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { stripHtmlTags, slugify } from "@/lib/utils";
import {
  CONTENT_RATINGS,
  PROJECT_GENRES,
  PROJECT_FORMATS,
  PROJECT_TONES,
  PREORDER_PRICE_MIN,
  PREORDER_PRICE_MAX,
  RELEASE_PRICE_MIN,
  RELEASE_PRICE_MAX,
  UNLOCK_TARGET_MIN,
  UNLOCK_TARGET_MAX,
  CAMPAIGN_DURATION_MIN,
  CAMPAIGN_DURATION_MAX,
  PRODUCTION_WINDOW_MIN,
  PRODUCTION_WINDOW_MAX,
  PROJECT_LAUNCH_MODES,
  EPISODE_COUNT_MIN,
  EPISODE_COUNT_MAX,
} from "@/types/project";
import type { ProjectLaunchMode } from "@/types/project";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("project-create", 5);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Check creator status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_creator, creator_good_standing")
      .eq("id", user.id)
      .single();

    if (!profile?.is_creator) {
      return NextResponse.json(
        { error: "You must be a creator to create projects" },
        { status: 403 }
      );
    }

    if (profile.creator_good_standing === false) {
      return NextResponse.json(
        { error: "Your creator account is not in good standing" },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { title, hook, synopsis, genre, tone, format, runtime_minutes, slug, inspiration_line } =
      body as Record<string, string | number | undefined>;

    // Launch mode — defaults to "preorder"
    const launchMode = (body.launch_mode as string) || "preorder";
    if (!(PROJECT_LAUNCH_MODES as readonly string[]).includes(launchMode)) {
      return NextResponse.json(
        { error: "launch_mode must be one of: teaser, preorder, production, direct_premiere, direct_release" },
        { status: 400 }
      );
    }
    const isTeaserMode = launchMode === "teaser";
    const isProductionMode = launchMode === "production";
    const isDirectMode =
      launchMode === "direct_premiere" || launchMode === "direct_release";
    const supportsPreorders = launchMode === "preorder" || isProductionMode;

    // Direct premiere/release modes require a finished film upload
    if (isDirectMode && !body.film_video_id) {
      return NextResponse.json(
        { error: "film_video_id is required for direct premiere and direct release modes" },
        { status: 400 }
      );
    }

    // Direct modes: release_price_cents is optional (free releases allowed)

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const normalizedTitle = stripHtmlTags(String(title).trim());
    if (normalizedTitle.length < 3 || normalizedTitle.length > 80) {
      return NextResponse.json(
        { error: "Title must be between 3 and 80 characters" },
        { status: 400 }
      );
    }

    // Generate slug from title if not provided
    const projectSlug = slug
      ? String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
      : slugify(normalizedTitle);

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", projectSlug)
      .maybeSingle();

    const finalSlug = existingSlug
      ? `${projectSlug}-${Date.now().toString(36)}`
      : projectSlug;

    const insertData: Record<string, unknown> = {
      creator_id: user.id,
      title: normalizedTitle,
      slug: finalSlug,
      launch_mode: launchMode as ProjectLaunchMode,
    };

    // Direct mode fields
    if (isDirectMode && body.film_video_id) {
      insertData.film_video_id = String(body.film_video_id);
    }
    if (body.release_option) {
      const ro = String(body.release_option);
      if (["backers_only", "premium_purchase", "free"].includes(ro)) {
        insertData.release_option = ro;
      }
    }
    if (body.premiere_date) {
      const pd = new Date(String(body.premiere_date));
      if (!isNaN(pd.getTime())) {
        insertData.premiere_date = pd.toISOString();
      }
    }

    if (hook && typeof hook === "string") {
      const cleanHook = stripHtmlTags(hook.trim());
      if (cleanHook.length > 120) {
        return NextResponse.json(
          { error: "Hook must be 120 characters or less" },
          { status: 400 }
        );
      }
      insertData.hook = cleanHook;
    }

    if (synopsis && typeof synopsis === "string") {
      const cleanSynopsis = stripHtmlTags(synopsis.trim());
      if (cleanSynopsis.length > 1000) {
        return NextResponse.json(
          { error: "Synopsis must be 1000 characters or less" },
          { status: 400 }
        );
      }
      insertData.synopsis = cleanSynopsis;
    }

    if (genre) {
      const g = String(genre);
      if (!(PROJECT_GENRES as readonly string[]).includes(g)) {
        return NextResponse.json({ error: "Invalid genre" }, { status: 400 });
      }
      insertData.genre = g;
    }
    if (tone) {
      const t = String(tone);
      if (!(PROJECT_TONES as readonly string[]).includes(t)) {
        return NextResponse.json({ error: "Invalid tone" }, { status: 400 });
      }
      insertData.tone = t;
    }
    if (format) {
      const f = String(format);
      if (!(PROJECT_FORMATS as readonly string[]).includes(f)) {
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
      }
      insertData.format = f;
    }

    if (body.content_rating) {
      const cr = String(body.content_rating);
      if (!(CONTENT_RATINGS as readonly string[]).includes(cr)) {
        return NextResponse.json(
          { error: "Content rating must be one of: general, teen, mature" },
          { status: 400 }
        );
      }
      insertData.content_rating = cr;
    }
    if (runtime_minutes !== undefined) {
      const rt = Number(runtime_minutes);
      if (!Number.isFinite(rt) || rt < 1 || rt > 240) {
        return NextResponse.json(
          { error: "Runtime must be between 1 and 240 minutes" },
          { status: 400 }
        );
      }
      insertData.runtime_minutes = rt;
    }

    if (inspiration_line && typeof inspiration_line === "string") {
      const cleanLine = stripHtmlTags(String(inspiration_line).trim());
      if (cleanLine.length > 200) {
        return NextResponse.json(
          { error: "Inspiration line must be 200 characters or less" },
          { status: 400 }
        );
      }
      insertData.inspiration_line = cleanLine;
    }

    // Preorder fields are used by preorder and production launch modes
    if (supportsPreorders) {
      if (body.preorder_price_cents != null) {
        const p = Number(body.preorder_price_cents);
        if (Number.isFinite(p) && p >= PREORDER_PRICE_MIN && p <= PREORDER_PRICE_MAX) {
          insertData.preorder_price_cents = p;
        }
      }

      if (launchMode === "preorder" && body.unlock_target != null) {
        const ut = Number(body.unlock_target);
        if (Number.isFinite(ut) && ut >= UNLOCK_TARGET_MIN && ut <= UNLOCK_TARGET_MAX) {
          insertData.unlock_target = ut;
        }
      }

      if (launchMode === "preorder" && body.campaign_duration_days != null) {
        const cd = Number(body.campaign_duration_days);
        if (cd >= CAMPAIGN_DURATION_MIN && cd <= CAMPAIGN_DURATION_MAX) {
          insertData.campaign_duration_days = cd;
        }
      }

      if (body.production_window_days != null) {
        const pw = Number(body.production_window_days);
        if (pw >= PRODUCTION_WINDOW_MIN && pw <= PRODUCTION_WINDOW_MAX) {
          insertData.production_window_days = pw;
        }
      }
    }

    // Episode count (relevant for series format)
    if (body.episode_count != null) {
      const ec = Number(body.episode_count);
      if (Number.isInteger(ec) && ec >= EPISODE_COUNT_MIN && ec <= EPISODE_COUNT_MAX) {
        insertData.episode_count = ec;
      }
    }

    // Release price (relevant for non-teaser modes)
    if (!isTeaserMode && body.release_price_cents != null) {
      const rp = Number(body.release_price_cents);
      if (Number.isFinite(rp) && rp >= RELEASE_PRICE_MIN && rp <= RELEASE_PRICE_MAX) {
        insertData.release_price_cents = rp;
      }
    }

    // Cross-validate: release price must not undercut preorders
    if (supportsPreorders && insertData.release_price_cents && insertData.preorder_price_cents &&
        (insertData.release_price_cents as number) < (insertData.preorder_price_cents as number)) {
      return NextResponse.json(
        { error: "Release price must be greater than or equal to preorder price" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[api] project create error:", error);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient();
    const { error: teamError } = await adminSupabase
      .from("project_collaborators")
      .upsert(
        {
          project_id: data.id,
          user_id: user.id,
          invited_by: user.id,
          role: "owner",
          invite_status: "accepted",
          can_view_earnings: true,
          accepted_at: new Date().toISOString(),
        },
        { onConflict: "project_id,user_id" }
      );

    if (teamError) {
      console.error("[api] project owner collaborator create error:", teamError);
      return NextResponse.json(
        { error: "Project created but failed to initialize team access" },
        { status: 500 }
      );
    }

    // Don't index to Meilisearch on creation — project is still a draft.
    // Indexing happens when the project goes live (submit/publish/moderate).

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
