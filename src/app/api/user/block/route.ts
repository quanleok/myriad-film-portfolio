import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const rateLimited = await checkRateLimit("block", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { creatorId } = await request.json();
    if (!creatorId) {
      return NextResponse.json({ error: "creatorId required" }, { status: 400 });
    }

    // Can't block yourself
    if (creatorId === user.id) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    const { error } = await supabase
      .from("blocked_creators")
      .upsert({ user_id: user.id, creator_id: creatorId }, { onConflict: "user_id,creator_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocked: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const rateLimited = await checkRateLimit("block", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { creatorId } = await request.json();
    if (!creatorId) {
      return NextResponse.json({ error: "creatorId required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("blocked_creators")
      .delete()
      .eq("user_id", user.id)
      .eq("creator_id", creatorId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocked: false });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
