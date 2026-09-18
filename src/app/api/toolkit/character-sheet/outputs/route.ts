import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logFailedAuth } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("character-sheet-outputs-list", 60);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/toolkit/character-sheet/outputs", "GET");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const characterId = new URL(request.url).searchParams.get("characterId")?.trim();
    if (!characterId) {
      return NextResponse.json({ error: "characterId is required" }, { status: 400 });
    }

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id")
      .eq("id", characterId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (characterError) throw characterError;
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const { data: outputs, error } = await supabase
      .from("character_outputs")
      .select("id, type, image_url, metadata_json, is_pinned, created_at")
      .eq("character_id", characterId)
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ outputs: outputs ?? [] });
  } catch (error) {
    console.error("[api] character-sheet outputs GET error:", error);
    return NextResponse.json({ error: "Failed to load character outputs" }, { status: 500 });
  }
}
