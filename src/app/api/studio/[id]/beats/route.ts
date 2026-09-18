import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioBeats } from "@/lib/studio/queries";
import { createStudioBeat } from "@/lib/studio/mutations";

const VALID_BEAT_TYPES = ["opening", "inciting_incident", "first_turn", "midpoint", "second_turn", "climax", "resolution", "custom"];
const VALID_ACTS = ["", "act_1", "act_2a", "act_2b", "act_3"];

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
    const beats = await getStudioBeats(admin, id);
    return NextResponse.json({ beats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load beats";
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
  const { title, description, act, beat_type, sort_order } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (beat_type && !VALID_BEAT_TYPES.includes(beat_type)) {
    return NextResponse.json({ error: "Invalid beat type" }, { status: 400 });
  }

  if (act && !VALID_ACTS.includes(act)) {
    return NextResponse.json({ error: "Invalid act" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const beat = await createStudioBeat(admin, id, { title, description, act, beat_type, sort_order });
    return NextResponse.json({ beat }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create beat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
