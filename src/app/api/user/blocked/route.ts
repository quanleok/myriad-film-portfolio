import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ blockedIds: [] });
    }

    const { data, error } = await supabase
      .from("blocked_creators")
      .select("creator_id, profiles!blocked_creators_creator_id_fkey(display_name, username, avatar_url)")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const blockedIds = (data ?? []).map((b: any) => b.creator_id);
    const blockedCreators = (data ?? []).map((b: any) => ({
      id: b.creator_id,
      display_name: b.profiles?.display_name,
      username: b.profiles?.username,
      avatar_url: b.profiles?.avatar_url,
    }));

    return NextResponse.json({ blockedIds, blockedCreators });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
