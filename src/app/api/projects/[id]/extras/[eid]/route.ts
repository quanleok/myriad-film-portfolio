import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripHtmlTags } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ id: string; eid: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("extras-update", 15);
    if (rateLimited) return rateLimited;

    const { id, eid } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify creator owns project and extra belongs to it
    const { data: extra } = await adminSupabase
      .from("project_extras")
      .select("id, project_id, creator_id, access_level, price_cents")
      .eq("id", eid)
      .eq("project_id", id)
      .single();

    if (!extra || extra.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = stripHtmlTags(String(body.title).trim());
      if (!title || title.length > 100) {
        return NextResponse.json({ error: "Title required, max 100 chars" }, { status: 400 });
      }
      updates.title = title;
    }

    if (body.description !== undefined) {
      const desc = body.description ? stripHtmlTags(String(body.description).trim()) : null;
      if (desc && desc.length > 500) {
        return NextResponse.json({ error: "Description max 500 chars" }, { status: 400 });
      }
      updates.description = desc;
    }

    if (body.access_level !== undefined) {
      if (!["free", "free_for_backers", "paid"].includes(String(body.access_level))) {
        return NextResponse.json({ error: "Invalid access_level" }, { status: 400 });
      }
      updates.access_level = String(body.access_level);
    }

    if (body.price_cents !== undefined) {
      updates.price_cents = typeof body.price_cents === "number" ? body.price_cents : null;
    }

    // Validate price if access_level is/becomes paid
    const finalAccessLevel = String(updates.access_level ?? extra.access_level);
    if (finalAccessLevel === "paid") {
      const finalPrice = updates.price_cents !== undefined
        ? updates.price_cents as number | null
        : extra.price_cents;
      if (!finalPrice || finalPrice < 100 || finalPrice > 5000) {
        return NextResponse.json({ error: "Paid extras: price $1–$50 required" }, { status: 400 });
      }
    }

    if (body.is_published !== undefined) {
      updates.is_published = body.is_published === true;
    }

    if (body.sort_order !== undefined && typeof body.sort_order === "number") {
      updates.sort_order = body.sort_order;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("project_extras")
      .update(updates)
      .eq("id", eid)
      .select()
      .single();

    if (error) {
      console.error("[api] update extra error:", error);
      return NextResponse.json({ error: "Failed to update extra" }, { status: 500 });
    }

    return NextResponse.json({ extra: data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("extras-delete", 10);
    if (rateLimited) return rateLimited;

    const { id, eid } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: extra } = await adminSupabase
      .from("project_extras")
      .select("id, creator_id")
      .eq("id", eid)
      .eq("project_id", id)
      .single();

    if (!extra || extra.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await adminSupabase
      .from("project_extras")
      .delete()
      .eq("id", eid);

    if (error) {
      console.error("[api] delete extra error:", error);
      return NextResponse.json({ error: "Failed to delete extra" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
