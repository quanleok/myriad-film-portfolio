import { createClient } from "@/lib/supabase/server";
import { notifyCreatorNewFollower } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("follow", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const { creatorId } = await request.json();
    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      );
    }

    if (creatorId === user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, creator_id: creatorId });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Already following" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Atomic follower_count increment (avoids race condition from read-then-write)
    await supabase.rpc("increment_follower_count", { profile_id: creatorId });

    // Notify creator
    const { data: followerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    await notifyCreatorNewFollower(
      creatorId,
      followerProfile?.display_name ?? "Someone"
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("follow", 20);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const { creatorId } = await request.json();
    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("creator_id", creatorId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Atomic follower_count decrement (avoids race condition from read-then-write)
    await supabase.rpc("decrement_follower_count", { profile_id: creatorId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const creatorId = url.searchParams.get("creatorId");

    if (creatorId) {
      // Check if following a specific creator
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("creator_id", creatorId)
        .maybeSingle();

      return NextResponse.json({ following: !!data });
    }

    // List all follows
    const { data } = await supabase
      .from("follows")
      .select(
        `
      id,
      created_at,
      profiles!follows_creator_id_fkey (
        id, display_name, username, avatar_url, subscriber_count
      )
    `
      )
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
