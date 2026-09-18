import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeCharacterName } from "@/lib/toolkit/character-sheet";

function getDescriptionSeed({
  current,
  refImageUrl,
  refImageStorageKey,
}: {
  current?: Record<string, unknown> | null;
  refImageUrl?: string | null;
  refImageStorageKey?: string | null;
}) {
  return {
    ...(current ?? {}),
    ...(refImageUrl !== undefined ? { source_image_url: refImageUrl || null } : {}),
    ...(refImageStorageKey !== undefined
      ? { source_image_storage_key: refImageStorageKey || null }
      : {}),
    ...(refImageUrl !== undefined ? { pinned_output_id: null } : {}),
  };
}

export async function GET() {
  try {
    const rateLimited = await checkRateLimit("character-sheet-characters-list", 60);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/toolkit/character-sheet/characters", "GET");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: characters, error: charactersError }, { data: outputs, error: outputsError }] =
      await Promise.all([
        supabase
          .from("characters")
          .select("id, name, ref_image_url, thumbnail_url, description_json, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("character_outputs")
          .select("id, character_id")
          .eq("user_id", user.id),
      ]);

    if (charactersError) throw charactersError;
    if (outputsError) throw outputsError;

    const outputCounts = new Map<string, number>();
    (outputs ?? []).forEach((output) => {
      outputCounts.set(output.character_id, (outputCounts.get(output.character_id) ?? 0) + 1);
    });

    return NextResponse.json({
      characters: (characters ?? []).map((character) => ({
        ...character,
        output_count: outputCounts.get(character.id) ?? 0,
      })),
    });
  } catch (error) {
    console.error("[api] character-sheet characters GET error:", error);
    return NextResponse.json({ error: "Failed to load characters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("character-sheet-characters-create", 12);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/toolkit/character-sheet/characters", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const body = (await request.json().catch(() => null)) as
      | {
          name?: string;
          ref_image_url?: string | null;
          ref_image_storage_key?: string | null;
        }
      | null;

    const name = normalizeCharacterName(body?.name ?? "");
    if (!name) {
      return NextResponse.json({ error: "Character name is required" }, { status: 400 });
    }

    const refImageUrl =
      typeof body?.ref_image_url === "string" && body.ref_image_url.trim().length > 0
        ? body.ref_image_url.trim()
        : null;
    const refImageStorageKey =
      typeof body?.ref_image_storage_key === "string" && body.ref_image_storage_key.trim().length > 0
        ? body.ref_image_storage_key.trim()
        : null;

    const descriptionJson = getDescriptionSeed({
      refImageUrl,
      refImageStorageKey,
    });

    const { data: character, error } = await supabase
      .from("characters")
      .insert({
        user_id: user.id,
        name,
        ref_image_url: refImageUrl,
        thumbnail_url: refImageUrl,
        description_json: descriptionJson,
      })
      .select("id, name, ref_image_url, thumbnail_url, description_json, created_at, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      character: {
        ...character,
        output_count: 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[api] character-sheet characters POST error:", error);
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }
}
