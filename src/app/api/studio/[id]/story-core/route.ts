import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioStoryCore } from "@/lib/studio/queries";
import { upsertStudioStoryCore } from "@/lib/studio/mutations";

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
    const storyCore = await getStudioStoryCore(admin, id);
    return NextResponse.json({ storyCore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load story core";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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
  const allowed = ["premise", "theme", "tone", "setting", "time_period", "world_rules", "synopsis"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  try {
    const admin = createAdminClient();
    const storyCore = await upsertStudioStoryCore(admin, id, updates);
    return NextResponse.json({ storyCore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update story core";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
