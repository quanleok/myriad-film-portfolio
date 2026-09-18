import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeCharacterName } from "@/lib/toolkit/character-sheet";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("character-sheet-character-update", 20);
    if (rateLimited) return rateLimited;

    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/toolkit/character-sheet/characters/${id}`, "PATCH");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const { data: existing, error: existingError } = await supabase
      .from("characters")
      .select("id, description_json")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          name?: string;
          ref_image_url?: string | null;
          thumbnail_url?: string | null;
          ref_image_storage_key?: string | null;
          description_json?: Record<string, unknown>;
        }
      | null;

    const updates: Record<string, unknown> = {};

    if (typeof body?.name === "string") {
      const name = normalizeCharacterName(body.name);
      if (!name) {
        return NextResponse.json({ error: "Character name is required" }, { status: 400 });
      }
      updates.name = name;
    }

    const nextDescriptionJson = {
      ...asObject(existing.description_json),
      ...asObject(body?.description_json),
    };

    if (body?.ref_image_url !== undefined) {
      const refImageUrl =
        typeof body.ref_image_url === "string" && body.ref_image_url.trim().length > 0
          ? body.ref_image_url.trim()
          : null;
      const thumbnailUrl =
        body.thumbnail_url === undefined
          ? refImageUrl
          : typeof body.thumbnail_url === "string" && body.thumbnail_url.trim().length > 0
            ? body.thumbnail_url.trim()
            : null;

      updates.ref_image_url = refImageUrl;
      updates.thumbnail_url = thumbnailUrl;
      nextDescriptionJson.source_image_url = refImageUrl;
      nextDescriptionJson.pinned_output_id = null;

      if (body.ref_image_storage_key !== undefined) {
        nextDescriptionJson.source_image_storage_key =
          typeof body.ref_image_storage_key === "string" && body.ref_image_storage_key.trim().length > 0
            ? body.ref_image_storage_key.trim()
            : null;
      }
    }

    if (body?.description_json !== undefined || body?.ref_image_url !== undefined) {
      updates.description_json = nextDescriptionJson;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const { data: character, error } = await supabase
      .from("characters")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, ref_image_url, thumbnail_url, description_json, created_at, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ character });
  } catch (error) {
    console.error("[api] character-sheet character PATCH error:", error);
    return NextResponse.json({ error: "Failed to update character" }, { status: 500 });
  }
}
