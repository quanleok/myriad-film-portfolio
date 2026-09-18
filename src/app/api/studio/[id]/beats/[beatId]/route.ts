import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateStudioBeat, deleteStudioBeat } from "@/lib/studio/mutations";

const VALID_BEAT_TYPES = ["opening", "inciting_incident", "first_turn", "midpoint", "second_turn", "climax", "resolution", "custom"];
const VALID_ACTS = ["", "act_1", "act_2a", "act_2b", "act_3"];
const VALID_STATUSES = ["draft", "in_review", "approved"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; beatId: string }> }
) {
  const { beatId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const allowed = ["title", "description", "act", "beat_type", "sort_order", "status", "linked_scene_ids"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if ("beat_type" in updates && !VALID_BEAT_TYPES.includes(updates.beat_type as string)) {
    return NextResponse.json({ error: "Invalid beat type" }, { status: 400 });
  }

  if ("act" in updates && !VALID_ACTS.includes(updates.act as string)) {
    return NextResponse.json({ error: "Invalid act" }, { status: 400 });
  }

  if ("status" in updates && !VALID_STATUSES.includes(updates.status as string)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const beat = await updateStudioBeat(admin, beatId, updates);
    return NextResponse.json({ beat });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update beat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; beatId: string }> }
) {
  const { beatId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    await deleteStudioBeat(admin, beatId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete beat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
