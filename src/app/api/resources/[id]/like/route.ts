import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/resources/[id]/like", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const { id } = await context.params;
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("resource_likes")
      .select("id")
      .eq("resource_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await admin.from("resource_likes").delete().eq("id", existing.id);
      const { data: resource } = await admin
        .from("resources")
        .select("like_count")
        .eq("id", id)
        .single();
      const count = Math.max(0, (resource?.like_count ?? 1) - 1);
      await admin.from("resources").update({ like_count: count }).eq("id", id);
      return NextResponse.json({ liked: false, like_count: count });
    }

    const { error: insertError } = await admin
      .from("resource_likes")
      .insert({ resource_id: id, user_id: user.id });

    if (insertError) {
      console.error("[api] resource like error:", insertError);
      return NextResponse.json({ error: "Could not like resource." }, { status: 500 });
    }

    const { data: resource } = await admin
      .from("resources")
      .select("like_count")
      .eq("id", id)
      .single();
    const count = (resource?.like_count ?? 0) + 1;
    await admin.from("resources").update({ like_count: count }).eq("id", id);

    return NextResponse.json({ liked: true, like_count: count });
  } catch (error) {
    console.error("[api] resource like POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
