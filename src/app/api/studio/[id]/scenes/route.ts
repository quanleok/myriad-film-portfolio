import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioScenes } from "@/lib/studio/queries";
import { createStudioScene } from "@/lib/studio/mutations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const scenes = await getStudioScenes(admin, id);
    return NextResponse.json({ scenes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load scenes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, beat, script_excerpt, sort_order } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const scene = await createStudioScene(admin, id, { title, beat, script_excerpt, sort_order });
    return NextResponse.json({ scene }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create scene";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
