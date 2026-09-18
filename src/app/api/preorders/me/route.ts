import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(_request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("preorder-list", 30);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch preorders, purchases, and entitlements in parallel
    const [preordersResult, purchasesResult, entitlementsResult] = await Promise.all([
      supabase
        .from("project_preorders")
        .select("id, project_id, amount_cents, current_status, created_at, refunded_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("post_release_purchases")
        .select("id, project_id, amount_cents, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_entitlements")
        .select("id, project_id, video_id, source_type, granted_at")
        .eq("user_id", user.id),
    ]);

    if (preordersResult.error) {
      console.error("[api] preorders fetch error:", preordersResult.error);
      return NextResponse.json(
        { error: "Failed to fetch preorders" },
        { status: 500 }
      );
    }

    const preorders = preordersResult.data ?? [];
    const purchases = purchasesResult.data ?? [];
    const entitlements = entitlementsResult.data ?? [];

    // Collect all unique project IDs across preorders and purchases
    const projectIds = [
      ...new Set([
        ...preorders.map((p) => p.project_id),
        ...purchases.map((p) => p.project_id),
      ]),
    ];

    if (projectIds.length === 0) {
      return NextResponse.json({ preorders: [], purchases: [], entitlements: [] });
    }

    // Fetch project info for all referenced projects
    const { data: projects } = await supabase
      .from("projects")
      .select(
        "id, title, slug, teaser_thumbnail_url, lifecycle_status, preorder_count_cache, unlock_target, film_video_id, runtime_minutes, premiere_date, estimated_delivery_at, purchase_count_cache, update_count_cache, production_window_days"
      )
      .in("id", projectIds);

    // Build a lookup map
    const projectMap = new Map(
      (projects ?? []).map((p) => [p.id, p])
    );

    // Merge project info into preorders
    const enrichedPreorders = preorders.map((preorder) => ({
      ...preorder,
      project: projectMap.get(preorder.project_id) ?? null,
    }));

    // Merge project info into purchases
    const enrichedPurchases = purchases.map((purchase) => ({
      ...purchase,
      project: projectMap.get(purchase.project_id) ?? null,
    }));

    return NextResponse.json({
      preorders: enrichedPreorders,
      purchases: enrichedPurchases,
      entitlements,
    });
  } catch (err) {
    console.error("[api] preorders me error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
