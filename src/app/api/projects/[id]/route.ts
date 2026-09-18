import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReadPrivateProject, getProjectAccessContext } from "@/lib/projects/team";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripHtmlTags } from "@/lib/utils";
import { checkBanned } from "@/lib/auth-checks";
import { indexProjectById } from "@/lib/meilisearch/client";
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
} from "@/types/project";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Try by ID first, then by slug
    let query = supabase
      .from("projects")
      .select(
        `
        id, creator_id, slug, title, hook, synopsis, inspiration_line, genre, tone, content_rating, format, is_test,
        runtime_minutes, teaser_asset_id, teaser_thumbnail_url, external_teaser_url,
        preorder_price_cents, release_price_cents, unlock_target, production_window_days, episode_count,
        campaign_duration_days, campaign_starts_at, campaign_ends_at,
        unlocked_at, estimated_delivery_at, delivered_at, delivery_deadline, premiere_date, film_video_id,
        lifecycle_status, launch_mode, moderation_status, visibility,
        preorder_count_cache, like_count_cache, discussion_count_cache, interest_count_cache, save_count_cache, purchase_count_cache, update_count_cache, production_progress,
        created_at, updated_at,
        profiles!projects_creator_id_fkey (
          id, display_name, username, avatar_url, bio,
          is_founding_creator, delivery_record_summary, creator_good_standing
        )
      `
      );

    // Check if id looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", id);
    }

    const { data: project, error } = await query.single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only show non-live projects to the creator
    if (project.moderation_status !== "live") {
      if (!user) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const access = await getProjectAccessContext(project.id, user.id);
      if (!canReadPrivateProject(access)) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    // Fetch character and concept cards with admin client (bypasses RLS)
    const adminClient = createAdminClient();

    const { data: characters } = await adminClient
      .from("project_character_cards")
      .select("id, sort_order, name, short_description, media_asset_id, media_type, video_asset_id")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true });

    const { data: concepts } = await adminClient
      .from("project_concept_cards")
      .select("id, sort_order, caption, media_asset_id, media_type, video_asset_id")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true });

    // Check if current user has preordered
    let hasPreordered = false;
    let userPreorderId: string | null = null;
    if (user) {
      const { data: preorder } = await supabase
        .from("project_preorders")
        .select("id, current_status")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .in("current_status", ["active", "committed"])
        .maybeSingle();

      if (preorder) {
        hasPreordered = true;
        userPreorderId = preorder.id;
      }
    }

    // Check if current user has purchased (post-release)
    let hasPurchased = false;
    if (user) {
      const { data: purchase } = await supabase
        .from("post_release_purchases")
        .select("id")
        .eq("project_id", project.id)
        .eq("user_id", user.id)
        .maybeSingle();

      hasPurchased = Boolean(purchase);
    }

    // Check if user has liked and/or expressed interest
    let hasLiked = false;
    let hasInterested = false;
    if (user) {
      const [likeResult, interestResult] = await Promise.all([
        supabase
          .from("project_likes")
          .select("id")
          .eq("project_id", project.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("project_interests")
          .select("id")
          .eq("project_id", project.id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      hasLiked = Boolean(likeResult.data);
      hasInterested = Boolean(interestResult.data);
    }

    // Fetch premiere info from the film video (if delivered)
    let premiere: {
      premiere_scheduled_at: string | null;
      is_premiere_live: boolean;
      premiere_ended: boolean;
    } | null = null;

    if (project.film_video_id) {
      const { data: filmVideo } = await supabase
        .from("videos")
        .select("premiere_at, is_premiere_live, premiere_ended")
        .eq("id", project.film_video_id)
        .single();

      if (filmVideo) {
        premiere = {
          premiere_scheduled_at: filmVideo.premiere_at ?? null,
          is_premiere_live: filmVideo.is_premiere_live ?? false,
          premiere_ended: filmVideo.premiere_ended ?? false,
        };
      }
    }

    // Fetch episodes for series projects
    let episodes = null;
    if ((project as Record<string, unknown>).format === "series" && (project as Record<string, unknown>).episode_count) {
      const { data: episodeData } = await adminClient
        .from("project_episodes")
        .select("id, episode_number, title, video_id, premiere_scheduled_at, premiere_ended, is_premiere_live")
        .eq("project_id", project.id)
        .order("episode_number", { ascending: true });
      episodes = episodeData;
    }

    // Compute is_overdue server-side
    const isOverdue = Boolean(
      (project as Record<string, unknown>).delivery_deadline &&
      new Date(String((project as Record<string, unknown>).delivery_deadline)) < new Date() &&
      !(project as Record<string, unknown>).delivered_at
    );

    const { count: releasedProjectCount } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", project.creator_id)
      .eq("lifecycle_status", "released")
      .eq("moderation_status", "live");

    return NextResponse.json({
      project: {
        ...project,
        is_overdue: isOverdue,
        profiles: project.profiles
          ? {
              ...project.profiles,
              released_project_count: releasedProjectCount ?? 0,
            }
          : null,
      },
      characters: characters ?? [],
      concepts: concepts ?? [],
      hasPreordered,
      hasPurchased,
      userPreorderId,
      hasLiked,
      hasInterested,
      premiere,
      episodes,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-edit", 20);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status, launch_mode, preorder_count_cache, preorder_price_cents, release_price_cents, production_progress")
      .eq("id", id)
      .single();

    if (!existing || existing.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Can only edit in draft, unlocking, or in_production states
    if (!["draft", "teaser", "unlocking", "in_production"].includes(existing.lifecycle_status)) {
      return NextResponse.json(
        { error: "Project can only be edited before release" },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    let launchMode = existing.launch_mode || "preorder";

    // launch_mode can only change while the project is still a draft
    if ("launch_mode" in body) {
      if (existing.lifecycle_status !== "draft") {
        return NextResponse.json(
          { error: "launch_mode can only be changed while the project is still a draft" },
          { status: 400 }
        );
      }

      const nextLaunchMode = body.launch_mode ? String(body.launch_mode) : "preorder";
      if (!(PROJECT_LAUNCH_MODES as readonly string[]).includes(nextLaunchMode)) {
        return NextResponse.json(
          { error: "launch_mode must be one of: teaser, preorder, production, direct_premiere, direct_release" },
          { status: 400 }
        );
      }

      launchMode = nextLaunchMode;
      updates.launch_mode = nextLaunchMode;
      if (nextLaunchMode !== "preorder") {
        updates.unlock_target = null;
        updates.campaign_duration_days = null;
      }
      if (nextLaunchMode === "teaser") {
        updates.preorder_price_cents = null;
        updates.production_window_days = null;
        updates.release_price_cents = null;
      }
    }

    const isTeaserMode = launchMode === "teaser";
    const isProductionMode = launchMode === "production";
    const isDirectMode =
      launchMode === "direct_premiere" || launchMode === "direct_release";
    const supportsPreorders = launchMode === "preorder" || isProductionMode;

    // Direct mode fields (film_video_id, release_option, premiere_date)
    if ("film_video_id" in body && existing.lifecycle_status === "draft") {
      updates.film_video_id = body.film_video_id ? String(body.film_video_id) : null;
    }
    if ("release_option" in body) {
      if (body.release_option) {
        const ro = String(body.release_option);
        if (["backers_only", "premium_purchase", "free"].includes(ro)) {
          updates.release_option = ro;
        }
      } else {
        updates.release_option = null;
      }
    }
    if ("premiere_date" in body) {
      if (body.premiere_date) {
        const pd = new Date(String(body.premiere_date));
        if (!isNaN(pd.getTime())) {
          updates.premiere_date = pd.toISOString();
        }
      } else {
        updates.premiere_date = null;
      }
    }

    // Validate and set each field
    if ("title" in body) {
      const t = stripHtmlTags(String(body.title).trim());
      if (t.length < 3 || t.length > 80) {
        return NextResponse.json(
          { error: "Title must be between 3 and 80 characters" },
          { status: 400 }
        );
      }
      updates.title = t;
    }

    if ("hook" in body) {
      if (body.hook) {
        const h = stripHtmlTags(String(body.hook).trim());
        if (h.length > 120) {
          return NextResponse.json(
            { error: "Hook must be 120 characters or less" },
            { status: 400 }
          );
        }
        updates.hook = h;
      } else {
        updates.hook = null;
      }
    }

    if ("synopsis" in body) {
      if (body.synopsis) {
        const s = stripHtmlTags(String(body.synopsis).trim());
        if (s.length > 1000) {
          return NextResponse.json(
            { error: "Synopsis must be 1000 characters or less" },
            { status: 400 }
          );
        }
        updates.synopsis = s;
      } else {
        updates.synopsis = null;
      }
    }

    // Validate enum fields
    if ("genre" in body) {
      if (body.genre) {
        if (!(PROJECT_GENRES as readonly string[]).includes(String(body.genre))) {
          return NextResponse.json({ error: "Invalid genre" }, { status: 400 });
        }
        updates.genre = String(body.genre);
      } else {
        updates.genre = null;
      }
    }
    if ("tone" in body) {
      if (body.tone) {
        if (!(PROJECT_TONES as readonly string[]).includes(String(body.tone))) {
          return NextResponse.json({ error: "Invalid tone" }, { status: 400 });
        }
        updates.tone = String(body.tone);
      } else {
        updates.tone = null;
      }
    }
    if ("format" in body) {
      if (body.format) {
        if (!(PROJECT_FORMATS as readonly string[]).includes(String(body.format))) {
          return NextResponse.json({ error: "Invalid format" }, { status: 400 });
        }
        updates.format = String(body.format);
      } else {
        updates.format = null;
      }
    }
    // Non-enum string fields
    const plainStringFields = ["teaser_asset_id", "teaser_thumbnail_url"];
    for (const f of plainStringFields) {
      if (f in body) updates[f] = body[f] || null;
    }

    if ("content_rating" in body) {
      if (body.content_rating) {
        if (!(CONTENT_RATINGS as readonly string[]).includes(String(body.content_rating))) {
          return NextResponse.json(
            { error: "Content rating must be one of: general, teen, mature" },
            { status: 400 }
          );
        }
        updates.content_rating = String(body.content_rating);
      } else {
        updates.content_rating = null;
      }
    }

    if ("runtime_minutes" in body) {
      if (body.runtime_minutes !== null) {
        const rt = Number(body.runtime_minutes);
        if (!Number.isFinite(rt) || rt < 1 || rt > 240) {
          return NextResponse.json(
            { error: "Runtime must be between 1 and 240 minutes" },
            { status: 400 }
          );
        }
        updates.runtime_minutes = rt;
      } else {
        updates.runtime_minutes = null;
      }
    }

    // Preorder fields are editable for preorder + production launch modes
    if (supportsPreorders) {
      if ("preorder_price_cents" in body) {
        // Preorder price locked after first backer
        if (existing.preorder_count_cache > 0) {
          return NextResponse.json(
            { error: "Preorder price cannot be changed after the first backer" },
            { status: 400 }
          );
        }
        if (body.preorder_price_cents !== null) {
          const p = Number(body.preorder_price_cents);
          if (!Number.isFinite(p) || p < PREORDER_PRICE_MIN || p > PREORDER_PRICE_MAX) {
            return NextResponse.json(
              { error: `Price must be between $${PREORDER_PRICE_MIN / 100} and $${PREORDER_PRICE_MAX / 100}` },
              { status: 400 }
            );
          }
          updates.preorder_price_cents = p;
        } else {
          updates.preorder_price_cents = null;
        }
      }

      if (launchMode === "preorder" && "unlock_target" in body) {
        // Unlock target locked after first backer
        if (existing.preorder_count_cache > 0) {
          return NextResponse.json(
            { error: "Unlock target cannot be changed after the first backer" },
            { status: 400 }
          );
        }
        if (body.unlock_target !== null) {
          const t = Number(body.unlock_target);
          if (!Number.isFinite(t) || t < UNLOCK_TARGET_MIN || t > UNLOCK_TARGET_MAX) {
            return NextResponse.json(
              { error: `Unlock target must be between ${UNLOCK_TARGET_MIN} and ${UNLOCK_TARGET_MAX}` },
              { status: 400 }
            );
          }
          updates.unlock_target = t;
        } else {
          updates.unlock_target = null;
        }
      }

      // Campaign duration and production window are only editable in draft
      if (
        launchMode === "preorder" &&
        "campaign_duration_days" in body &&
        existing.lifecycle_status === "draft"
      ) {
        const d = Number(body.campaign_duration_days);
        if (d < CAMPAIGN_DURATION_MIN || d > CAMPAIGN_DURATION_MAX) {
          return NextResponse.json(
            { error: `Campaign duration must be ${CAMPAIGN_DURATION_MIN}–${CAMPAIGN_DURATION_MAX} days` },
            { status: 400 }
          );
        }
        updates.campaign_duration_days = d;
      }

      if ("production_window_days" in body && existing.lifecycle_status === "draft") {
        const w = Number(body.production_window_days);
        if (w < PRODUCTION_WINDOW_MIN || w > PRODUCTION_WINDOW_MAX) {
          return NextResponse.json(
            { error: `Production window must be ${PRODUCTION_WINDOW_MIN}–${PRODUCTION_WINDOW_MAX} days` },
            { status: 400 }
          );
        }
        updates.production_window_days = w;
      }
    }

    if (launchMode !== "preorder" && existing.lifecycle_status === "draft") {
      if ("unlock_target" in body) {
        updates.unlock_target = null;
      }
      if ("campaign_duration_days" in body) {
        updates.campaign_duration_days = null;
      }
    }

    // Episode count (only editable in draft, for series format)
    if ("episode_count" in body && existing.lifecycle_status === "draft") {
      if (body.episode_count !== null) {
        const ec = Number(body.episode_count);
        if (!Number.isInteger(ec) || ec < 2 || ec > 50) {
          return NextResponse.json(
            { error: "Episode count must be between 2 and 50" },
            { status: 400 }
          );
        }
        updates.episode_count = ec;
      } else {
        updates.episode_count = null;
      }
    }

    if ("release_price_cents" in body) {
      if (isTeaserMode) {
        if (body.release_price_cents === null || body.release_price_cents === "" || body.release_price_cents === undefined) {
          updates.release_price_cents = null;
        } else {
          return NextResponse.json(
            { error: "Teaser projects do not use release pricing until they are converted" },
            { status: 400 }
          );
        }
      } else {
      if (["premiering", "released"].includes(existing.lifecycle_status)) {
        return NextResponse.json(
          { error: "Release price cannot be changed after premiere" },
          { status: 400 }
        );
      }
        if (body.release_price_cents !== null) {
          const rp = Number(body.release_price_cents);
          if (!Number.isFinite(rp) || rp < RELEASE_PRICE_MIN || rp > RELEASE_PRICE_MAX) {
            return NextResponse.json(
              { error: `Release price must be between $${RELEASE_PRICE_MIN / 100} and $${RELEASE_PRICE_MAX / 100}` },
              { status: 400 }
            );
          }
          updates.release_price_cents = rp;
        } else {
          updates.release_price_cents = null;
        }
      }
    }

    const effectivePreorderPrice = (updates.preorder_price_cents as number | null | undefined)
      ?? existing.preorder_price_cents
      ?? null;
    const effectiveReleasePrice = (updates.release_price_cents as number | null | undefined)
      ?? existing.release_price_cents
      ?? null;

    if (
      supportsPreorders &&
      effectivePreorderPrice &&
      effectiveReleasePrice &&
      effectiveReleasePrice < effectivePreorderPrice
    ) {
      return NextResponse.json(
        { error: "Release price must be greater than or equal to preorder price" },
        { status: 400 }
      );
    }

    if ("production_progress" in body) {
      if (existing.lifecycle_status !== "in_production") {
        return NextResponse.json(
          { error: "Production progress can only be set during production" },
          { status: 400 }
        );
      }
      const pp = Number(body.production_progress);
      if (!Number.isFinite(pp) || pp < 0 || pp > 100) {
        return NextResponse.json(
          { error: "Production progress must be between 0 and 100" },
          { status: 400 }
        );
      }
      if (pp < (existing.production_progress ?? 0)) {
        return NextResponse.json(
          { error: "Production progress cannot decrease" },
          { status: 400 }
        );
      }
      updates.production_progress = pp;
    }

    if ("estimated_delivery_at" in body) {
      if (existing.lifecycle_status !== "in_production") {
        return NextResponse.json(
          { error: "Estimated delivery can only be changed during production" },
          { status: 400 }
        );
      }
      if (body.estimated_delivery_at) {
        const ed = new Date(String(body.estimated_delivery_at));
        if (isNaN(ed.getTime())) {
          return NextResponse.json(
            { error: "Invalid date" },
            { status: 400 }
          );
        }
        updates.estimated_delivery_at = ed.toISOString();
      }
    }

    if ("inspiration_line" in body) {
      if (body.inspiration_line) {
        const il = stripHtmlTags(String(body.inspiration_line).trim());
        if (il.length > 200) {
          return NextResponse.json(
            { error: "Inspiration line must be 200 characters or less" },
            { status: 400 }
          );
        }
        updates.inspiration_line = il;
      } else {
        updates.inspiration_line = null;
      }
    }

    // Cross-validate: release_price must be >= preorder_price (preorder mode only)
    if (!isDirectMode) {
      const effectivePreorderPrice = (updates.preorder_price_cents as number | null) ?? existing.preorder_price_cents;
      const effectiveReleasePrice = (updates.release_price_cents as number | null) ?? existing.release_price_cents;
      if (effectiveReleasePrice && effectivePreorderPrice && effectiveReleasePrice < effectivePreorderPrice) {
        return NextResponse.json(
          { error: "Release price must be greater than or equal to preorder price" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id)
      .eq("creator_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[api] project update error:", error);
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      );
    }

    // Reindex to Meilisearch (fire-and-forget)
    indexProjectById(id);

    return NextResponse.json({ project: data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-delete", 5);
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

    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status, moderation_status")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.lifecycle_status !== "draft") {
      return NextResponse.json(
        { error: "Only draft projects can be deleted" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS (ownership already verified above)
    const admin = createAdminClient();
    await admin.from("project_character_cards").delete().eq("project_id", id);
    await admin.from("project_concept_cards").delete().eq("project_id", id);

    const { error } = await admin
      .from("projects")
      .delete()
      .eq("id", id)
      .eq("creator_id", user.id);

    if (error) {
      console.error("[api] project delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
