import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  REACTION_EMOJIS,
  createEmptyReactionCounts,
  type ReactionEmoji,
} from "@/lib/reactions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const db = supabase as any;

    const { data, error } = await db
      .from("video_reactions")
      .select("emoji, user_id")
      .eq("video_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts = createEmptyReactionCounts();
    const selected = new Set<ReactionEmoji>();

    for (const row of (data ?? []) as { emoji: ReactionEmoji; user_id: string }[]) {
      if ((REACTION_EMOJIS as readonly string[]).includes(row.emoji)) {
        counts[row.emoji] += 1;
        if (user?.id && row.user_id === user.id) {
          selected.add(row.emoji);
        }
      }
    }

    return NextResponse.json({
      counts,
      selected: Array.from(selected),
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
