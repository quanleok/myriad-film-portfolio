import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  fetchRemoteImageAsBase64,
  getDescriptionSystemPrompt,
  getImagePrompt,
  getPaletteSystemPrompt,
  requestAnthropicJson,
  requestCharacterImageGeneration,
  type CharacterDescriptionAnalysis,
  type CharacterOutputMetadata,
  type CharacterPaletteAnalysis,
} from "@/lib/toolkit/character-sheet";
import {
  isCharacterOutputType,
  isImageOutputType,
  type CharacterOutputType,
} from "@/lib/toolkit/character-sheet-config";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function uploadGeneratedAsset({
  admin,
  userId,
  characterId,
  outputType,
  buffer,
  mediaType,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  characterId: string;
  outputType: CharacterOutputType;
  buffer: ArrayBuffer | Uint8Array;
  mediaType: string;
}) {
  const ext = mediaType.includes("webp")
    ? "webp"
    : mediaType.includes("jpeg")
      ? "jpg"
      : "png";
  const storageKey = `toolkit/character-sheet/${userId}/generated/${characterId}/${Date.now()}-${outputType}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("workshop-media")
    .upload(storageKey, buffer, {
      contentType: mediaType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error("Generated image upload failed.");
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("workshop-media").getPublicUrl(storageKey);

  return {
    publicUrl,
    storageKey,
    mediaType,
  };
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit(
      "character-sheet-generate",
      10,
      60 * 60 * 1000
    );
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/toolkit/character-sheet/generate", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const body = (await request.json().catch(() => null)) as
      | {
          imageUrl?: string;
          imageStorageKey?: string | null;
          outputType?: string;
          characterId?: string;
          hint?: string;
        }
      | null;

    const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
    const imageStorageKey =
      typeof body?.imageStorageKey === "string" && body.imageStorageKey.trim().length > 0
        ? body.imageStorageKey.trim()
        : null;
    const outputType = body?.outputType;
    const characterId = typeof body?.characterId === "string" ? body.characterId.trim() : "";
    const hint = typeof body?.hint === "string" ? body.hint.trim() : "";

    if (!imageUrl) {
      return NextResponse.json({ error: "Reference image is required." }, { status: 400 });
    }

    if (!characterId) {
      return NextResponse.json({ error: "Character folder is required." }, { status: 400 });
    }

    if (!isCharacterOutputType(outputType)) {
      return NextResponse.json({ error: "Output type is invalid." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: character, error: characterError } = await admin
      .from("characters")
      .select("id, name, user_id, ref_image_url, description_json")
      .eq("id", characterId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (characterError) throw characterError;
    if (!character) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    const nextDescriptionJson = {
      ...asObject(character.description_json),
      source_image_url: imageUrl,
      ...(imageStorageKey ? { source_image_storage_key: imageStorageKey } : {}),
      pinned_output_id: null,
    };

    if (character.ref_image_url !== imageUrl) {
      const { error: characterUpdateError } = await admin
        .from("characters")
        .update({
          ref_image_url: imageUrl,
          thumbnail_url: imageUrl,
          description_json: nextDescriptionJson,
        })
        .eq("id", character.id)
        .eq("user_id", user.id);

      if (characterUpdateError) throw characterUpdateError;
    }

    if (!isImageOutputType(outputType)) {
      const { base64, mediaType } = await fetchRemoteImageAsBase64(imageUrl);

      if (outputType === "description") {
        const analysis = await requestAnthropicJson<CharacterDescriptionAnalysis>({
          imageBase64: base64,
          mediaType,
          systemPrompt: getDescriptionSystemPrompt(hint),
        });

        const metadata: CharacterOutputMetadata = {
          analysis,
          provider: "anthropic",
          sourceImageUrl: imageUrl,
          sourceImageStorageKey: imageStorageKey,
        };

        const { data: output, error: insertError } = await admin
          .from("character_outputs")
          .insert({
            character_id: character.id,
            user_id: user.id,
            type: outputType,
            image_url: null,
            metadata_json: metadata,
          })
          .select("id, type, image_url, metadata_json, is_pinned, created_at")
          .single();

        if (insertError) throw insertError;

        await admin
          .from("characters")
          .update({
            description_json: {
              ...nextDescriptionJson,
              latest_description: analysis,
            },
          })
          .eq("id", character.id)
          .eq("user_id", user.id);

        return NextResponse.json({ output });
      }

      const palette = await requestAnthropicJson<CharacterPaletteAnalysis>({
        imageBase64: base64,
        mediaType,
        systemPrompt: getPaletteSystemPrompt(hint),
      });

      const metadata: CharacterOutputMetadata = {
        palette,
        provider: "anthropic",
        sourceImageUrl: imageUrl,
        sourceImageStorageKey: imageStorageKey,
      };

      const { data: output, error: insertError } = await admin
        .from("character_outputs")
        .insert({
          character_id: character.id,
          user_id: user.id,
          type: outputType,
          image_url: null,
          metadata_json: metadata,
        })
        .select("id, type, image_url, metadata_json, is_pinned, created_at")
        .single();

      if (insertError) throw insertError;

      await admin
        .from("characters")
        .update({
          description_json: {
            ...nextDescriptionJson,
            latest_palette: palette,
          },
        })
        .eq("id", character.id)
        .eq("user_id", user.id);

      return NextResponse.json({ output });
    }

    const prompt = getImagePrompt({
      type: outputType,
      characterName: character.name,
      hint,
    });
    const generated = await requestCharacterImageGeneration({
      imageUrl,
      prompt,
      outputType,
    });

    let uploaded:
      | {
          publicUrl: string;
          storageKey: string;
          mediaType: string;
        }
      | null = null;

    if (generated.imageBase64) {
      const buffer = Uint8Array.from(Buffer.from(generated.imageBase64, "base64"));
      uploaded = await uploadGeneratedAsset({
        admin,
        userId: user.id,
        characterId: character.id,
        outputType,
        buffer,
        mediaType: generated.mediaType,
      });
    } else if (generated.imageUrl) {
      const imageResponse = await fetch(generated.imageUrl);
      if (!imageResponse.ok) {
        throw new Error("The generated image could not be downloaded.");
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      uploaded = await uploadGeneratedAsset({
        admin,
        userId: user.id,
        characterId: character.id,
        outputType,
        buffer: arrayBuffer,
        mediaType: imageResponse.headers.get("content-type") || generated.mediaType,
      });
    }

    if (!uploaded) {
      throw new Error("The image provider did not return an image.");
    }

    const metadata: CharacterOutputMetadata = {
      prompt,
      provider: generated.provider,
      sourceImageUrl: imageUrl,
      sourceImageStorageKey: imageStorageKey,
      storageKey: uploaded.storageKey,
      mediaType: uploaded.mediaType,
    };

    const { data: output, error: insertError } = await admin
      .from("character_outputs")
      .insert({
        character_id: character.id,
        user_id: user.id,
        type: outputType,
        image_url: uploaded.publicUrl,
        metadata_json: {
          ...metadata,
          ...(generated.metadata ? { provider_metadata: generated.metadata } : {}),
        },
      })
      .select("id, type, image_url, metadata_json, is_pinned, created_at")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ output });
  } catch (error) {
    console.error("[api] character-sheet generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed." },
      { status: 500 }
    );
  }
}
