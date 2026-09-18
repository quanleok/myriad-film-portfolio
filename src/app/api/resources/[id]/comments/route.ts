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
  return NextResponse.json({ comments: resource.comments });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/resources/[id]/comments", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const { body } = (await request.json()) as { body?: string };
    if (!body?.trim()) {
      return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
    }

    const { id } = await context.params;
    const admin = createAdminClient();
    const { error } = await admin
      .from("resource_comments")
      .insert({ resource_id: id, user_id: user.id, body: body.trim() });

    if (error) {
      console.error("[api] resource comment error:", error);
      return NextResponse.json({ error: "Could not save comment." }, { status: 500 });
    }

    const { data: resource } = await admin
      .from("resources")
      .select("comment_count")
      .eq("id", id)
      .single();

    await admin
      .from("resources")
      .update({ comment_count: (resource?.comment_count ?? 0) + 1 })
      .eq("id", id);

    const detail = await fetchResourceDetail(id);
    return NextResponse.json({ comments: detail?.comments ?? [] }, { status: 201 });
  } catch (error) {
    console.error("[api] resource comments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
