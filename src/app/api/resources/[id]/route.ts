import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { fetchResourceDetail } from "@/lib/resources-server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const resource = await fetchResourceDetail(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }
  return NextResponse.json({ resource });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/resources/[id]", "DELETE");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const { id } = await context.params;
    const admin = createAdminClient();

    const { data: resource } = await admin
      .from("resources")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!resource || resource.user_id !== user.id) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const { error } = await admin.from("resources").delete().eq("id", id);
    if (error) {
      console.error("[api] resource delete error:", error);
      return NextResponse.json({ error: "Could not delete resource." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api] resources DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
