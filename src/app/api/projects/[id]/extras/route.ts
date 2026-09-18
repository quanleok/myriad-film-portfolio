import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripHtmlTags } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const adminSupabase = createAdminClient();

    // Check if creator is requesting all extras (including unpublished)
    const showAll = request.nextUrl.searchParams.get("all") === "true";

    let query = adminSupabase
      .from("project_extras")
      .select("id, project_id, creator_id, title, description, media_asset_id, media_type, access_level, price_cents, is_published, sort_order, created_at")
      .eq("project_id", id)
      .order("sort_order", { ascending: true });

    // Only filter published for non-creator requests
    if (!showAll) {
      query = query.eq("is_published", true);
    }

    const { data: extras, error } = await query;

    if (error) {
      console.error("[api] fetch extras error:", error);
      return NextResponse.json({ error: "Failed to fetch extras" }, { status: 500 });
    }

    if (!extras || extras.length === 0) {
      return NextResponse.json({ extras: [], hasPreordered: false });
    }

    // If showAll, verify the requester is the project creator
    if (showAll) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || extras[0].creator_id !== user.id) {
        // Fall back to published only
        const published = extras.filter((e: { is_published: boolean }) => e.is_published);
        return NextResponse.json({ extras: published.map((e: Record<string, unknown>) => ({ ...e, has_access: e.access_level === "free", is_purchased: false, media_asset_id: e.access_level === "free" ? e.media_asset_id : null })), hasPreordered: false });
      }
      // Creator sees everything with full access
      return NextResponse.json({
        extras: extras.map((e: Record<string, unknown>) => ({ ...e, has_access: true, is_purchased: false })),
        hasPreordered: false,
      });
    }

    // Check auth for access computation
    let hasPreordered = false;
    const purchasedExtraIds = new Set<string>();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const [preorderResult, purchaseResult] = await Promise.all([
        adminSupabase
          .from("project_preorders")
          .select("id")
          .eq("project_id", id)
          .eq("user_id", user.id)
          .in("current_status", ["active", "committed"])
          .maybeSingle(),
        adminSupabase
          .from("project_extra_purchases")
          .select("extra_id")
          .eq("user_id", user.id)
          .in("extra_id", extras.map((e: { id: string }) => e.id)),
      ]);

      hasPreordered = !!preorderResult.data;
      for (const p of purchaseResult.data ?? []) {
        purchasedExtraIds.add((p as { extra_id: string }).extra_id);
      }
    }

    const enrichedExtras = extras.map((extra: { id: string; title: string; description: string | null; media_asset_id: string; media_type: string; access_level: string; price_cents: number | null; is_published: boolean; sort_order: number; created_at: string }) => {
      let has_access = false;
      if (extra.access_level === "free") has_access = true;
      else if (extra.access_level === "free_for_backers") has_access = hasPreordered;
      else if (extra.access_level === "paid") has_access = purchasedExtraIds.has(extra.id);

      return {
        id: extra.id,
        title: extra.title,
        description: extra.description,
        media_asset_id: has_access ? extra.media_asset_id : null,
        media_type: extra.media_type,
        access_level: extra.access_level,
        price_cents: extra.price_cents,
        has_access,
        is_purchased: purchasedExtraIds.has(extra.id),
        sort_order: extra.sort_order,
        created_at: extra.created_at,
      };
    });

    return NextResponse.json({ extras: enrichedExtras, hasPreordered });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("extras-create", 10);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify user is project creator
    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, creator_id")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Validate fields
    const title = typeof body.title === "string" ? stripHtmlTags(body.title.trim()) : "";
    if (!title || title.length > 100) {
      return NextResponse.json({ error: "Title required, max 100 chars" }, { status: 400 });
    }

    const description = typeof body.description === "string" ? stripHtmlTags(body.description.trim()) : null;
    if (description && description.length > 500) {
      return NextResponse.json({ error: "Description max 500 chars" }, { status: 400 });
    }

    const media_asset_id = typeof body.media_asset_id === "string" ? body.media_asset_id.trim() : "";
    if (!media_asset_id) {
      return NextResponse.json({ error: "media_asset_id required" }, { status: 400 });
    }

    const media_type = body.media_type;
    if (media_type !== "image" && media_type !== "video") {
      return NextResponse.json({ error: "media_type must be image or video" }, { status: 400 });
    }

    const access_level = body.access_level ?? "free";
    if (!["free", "free_for_backers", "paid"].includes(String(access_level))) {
      return NextResponse.json({ error: "Invalid access_level" }, { status: 400 });
    }

    let price_cents: number | null = null;
    if (access_level === "paid") {
      price_cents = typeof body.price_cents === "number" ? body.price_cents : null;
      if (!price_cents || price_cents < 100 || price_cents > 5000) {
        return NextResponse.json({ error: "Paid extras: price $1–$50" }, { status: 400 });
      }
    }

    // Get next sort_order
    const { data: lastExtra } = await adminSupabase
      .from("project_extras")
      .select("sort_order")
      .eq("project_id", id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (lastExtra?.sort_order ?? -1) + 1;

    const { data, error } = await adminSupabase
      .from("project_extras")
      .insert({
        project_id: id,
        creator_id: user.id,
        title,
        description,
        media_asset_id,
        media_type: String(media_type),
        access_level: String(access_level),
        price_cents,
        is_published: body.is_published === true,
        sort_order,
      })
      .select()
      .single();

    if (error) {
      console.error("[api] create extra error:", error);
      return NextResponse.json({ error: "Failed to create extra" }, { status: 500 });
    }

    return NextResponse.json({ extra: data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
