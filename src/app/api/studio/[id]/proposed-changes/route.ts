import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioProposedChanges } from "@/lib/studio/queries";
import { createStudioProposedChange } from "@/lib/studio/mutations";

const VALID_TARGET_TYPES = ["entity", "beat", "scene", "script_excerpt", "story_core"];
const VALID_CHANGE_TYPES = ["update", "create", "delete"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const admin = createAdminClient();
    const changes = await getStudioProposedChanges(admin, id, status);
    return NextResponse.json({ changes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch changes";
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
  const { room_id, target_type, target_id, change_type, field_name, old_value, new_value, summary } = body;

  if (!room_id?.trim()) {
    return NextResponse.json({ error: "room_id is required" }, { status: 400 });
  }

  if (!target_type || !VALID_TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ error: `target_type must be one of: ${VALID_TARGET_TYPES.join(", ")}` }, { status: 400 });
  }

  if (!change_type || !VALID_CHANGE_TYPES.includes(change_type)) {
    return NextResponse.json({ error: `change_type must be one of: ${VALID_CHANGE_TYPES.join(", ")}` }, { status: 400 });
  }

  if (!summary?.trim()) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const change = await createStudioProposedChange(admin, room_id, id, {
      target_type,
      target_id,
      change_type,
      field_name,
      old_value,
      new_value,
      summary,
    });
    return NextResponse.json({ change }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create change";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
