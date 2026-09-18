import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const rateLimited = await checkRateLimit("character-sheet-output-update", 20);
    if (rateLimited) return rateLimited;

    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/toolkit/character-sheet/outputs/${id}`, "PATCH");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const admin = createAdminClient();
    const { data: output, error: outputError } = await admin
      .from("character_outputs")
      .select("id, character_id, user_id, image_url, is_pinned")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (outputError) throw outputError;
    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as { is_pinned?: boolean } | null;
    if (typeof body?.is_pinned !== "boolean") {
      return NextResponse.json({ error: "is_pinned must be a boolean" }, { status: 400 });
    }

    const { data: character, error: characterError } = await admin
      .from("characters")
      .select("description_json")
      .eq("id", output.character_id)
      .eq("user_id", user.id)
      .single();

    if (characterError) throw characterError;

    const descriptionJson = asObject(character.description_json);

    if (body.is_pinned) {
      if (!output.image_url) {
        return NextResponse.json(
          { error: "Only image outputs can be pinned as the active reference." },
          { status: 400 }
        );
      }

      const [{ error: clearPinsError }, { data: updatedOutput, error: pinError }] = await Promise.all([
        admin
          .from("character_outputs")
          .update({ is_pinned: false })
          .eq("character_id", output.character_id)
          .eq("user_id", user.id),
        admin
          .from("character_outputs")
          .update({ is_pinned: true })
          .eq("id", output.id)
          .eq("user_id", user.id)
          .select("id, type, image_url, metadata_json, is_pinned, created_at")
          .single(),
      ]);

      if (clearPinsError) throw clearPinsError;
      if (pinError) throw pinError;

      const { error: characterUpdateError } = await admin
        .from("characters")
        .update({
          ref_image_url: output.image_url,
          thumbnail_url: output.image_url,
          description_json: {
            ...descriptionJson,
            pinned_output_id: output.id,
          },
        })
        .eq("id", output.character_id)
        .eq("user_id", user.id);

      if (characterUpdateError) throw characterUpdateError;

      return NextResponse.json({ output: updatedOutput });
    }

    const { data: updatedOutput, error: updateError } = await admin
      .from("character_outputs")
      .update({ is_pinned: false })
      .eq("id", output.id)
      .eq("user_id", user.id)
      .select("id, type, image_url, metadata_json, is_pinned, created_at")
      .single();

    if (updateError) throw updateError;

    const sourceImageUrl =
      typeof descriptionJson.source_image_url === "string" && descriptionJson.source_image_url.length > 0
        ? descriptionJson.source_image_url
        : null;

    const { error: characterUpdateError } = await admin
      .from("characters")
      .update({
        ref_image_url: sourceImageUrl,
        thumbnail_url: sourceImageUrl,
        description_json: {
          ...descriptionJson,
          pinned_output_id: null,
        },
      })
      .eq("id", output.character_id)
      .eq("user_id", user.id);

    if (characterUpdateError) throw characterUpdateError;

    return NextResponse.json({ output: updatedOutput });
  } catch (error) {
    console.error("[api] character-sheet output PATCH error:", error);
    return NextResponse.json({ error: "Failed to update output" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("character-sheet-output-delete", 20);
    if (rateLimited) return rateLimited;

    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth(`/api/toolkit/character-sheet/outputs/${id}`, "DELETE");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const admin = createAdminClient();
    const { data: output, error: outputError } = await admin
      .from("character_outputs")
      .select("id, character_id, user_id, image_url, metadata_json, is_pinned")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (outputError) throw outputError;
    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    const { data: character, error: characterError } = await admin
      .from("characters")
      .select("description_json")
      .eq("id", output.character_id)
      .eq("user_id", user.id)
      .single();

    if (characterError) throw characterError;

    const descriptionJson = asObject(character.description_json);
    const pinnedOutputId =
      typeof descriptionJson.pinned_output_id === "string" ? descriptionJson.pinned_output_id : null;

    const storageKey =
      typeof asObject(output.metadata_json).storageKey === "string"
        ? (asObject(output.metadata_json).storageKey as string)
        : null;

    const { error: deleteError } = await admin
      .from("character_outputs")
      .delete()
      .eq("id", output.id)
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;

    if (storageKey) {
      await admin.storage.from("workshop-media").remove([storageKey]);
    }

    if (output.is_pinned || pinnedOutputId === output.id) {
      const { data: replacement, error: replacementError } = await admin
        .from("character_outputs")
        .select("id, image_url")
        .eq("character_id", output.character_id)
        .eq("user_id", user.id)
        .not("image_url", "is", null)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (replacementError) throw replacementError;

      const sourceImageUrl =
        typeof descriptionJson.source_image_url === "string" && descriptionJson.source_image_url.length > 0
          ? descriptionJson.source_image_url
          : null;
      const nextImage = replacement?.image_url ?? sourceImageUrl ?? null;

      const { error: characterUpdateError } = await admin
        .from("characters")
        .update({
          ref_image_url: nextImage,
          thumbnail_url: nextImage,
          description_json: {
            ...descriptionJson,
            pinned_output_id: replacement?.id ?? null,
          },
        })
        .eq("id", output.character_id)
        .eq("user_id", user.id);

      if (characterUpdateError) throw characterUpdateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] character-sheet output DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete output" }, { status: 500 });
  }
}
