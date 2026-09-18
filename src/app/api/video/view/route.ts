import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit("video-view", 60);
  if (rateLimited) return rateLimited;
  try {
    const { videoId } = await request.json();
    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("increment_view_count", {
      vid: videoId,
    });

    if (error) {
      console.error("increment_view_count RPC failed:", error.message);
      return NextResponse.json(
        { error: "Failed to record view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
