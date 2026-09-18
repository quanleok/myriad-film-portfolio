import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  REACTION_EMOJIS,
  createEmptyReactionCounts,
  isReactionEmoji,
  type ReactionEmoji,
} from "@/lib/reactions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getReactionState(supabase: Awaited<ReturnType<typeof createClient>>, videoId: string, userId: string) {
  const db = supabase as any;

  const { data, error } = await db
    .from("video_reactions")
    .select("emoji, user_id")
    .eq("video_id", videoId);

  if (error) {
    throw new Error(error.message);
  }

  const counts = createEmptyReactionCounts();
  const selected = new Set<ReactionEmoji>();

  for (const row of (data ?? []) as { emoji: ReactionEmoji; user_id: string }[]) {
    if ((REACTION_EMOJIS as readonly string[]).includes(row.emoji)) {
      counts[row.emoji] += 1;
      if (row.user_id === userId) {
        selected.add(row.emoji);
      }
    }
  }

  return { counts, selected: Array.from(selected) };
}

export async function POST(request: Request, { params }: RouteContext) {
  const rateLimited = await checkRateLimit("video-react", 30);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const emoji = typeof body?.emoji === "string" ? body.emoji : "";

  if (!isReactionEmoji(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  const db = supabase as any;

  // Check if user already reacted with this exact emoji (toggle off)
  const { data: sameEmoji, error: sameError } = await db
    .from("video_reactions")
    .select("id")
    .eq("video_id", id)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (sameError) {
    return NextResponse.json({ error: sameError.message }, { status: 500 });
  }

  let reacted = false;

  if (sameEmoji) {
    // Toggle off — remove the reaction
    const { error } = await db
      .from("video_reactions")
      .delete()
      .eq("id", sameEmoji.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // One reaction per video: delete any existing reaction first
    await db
      .from("video_reactions")
      .delete()
      .eq("video_id", id)
      .eq("user_id", user.id);

    const { error } = await db
      .from("video_reactions")
      .insert({
        video_id: id,
        user_id: user.id,
        emoji,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    reacted = true;
  }

  try {
    const state = await getReactionState(supabase, id, user.id);
    return NextResponse.json({
      reacted,
      ...state,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reaction state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
