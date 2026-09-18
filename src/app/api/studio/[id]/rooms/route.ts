import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioRooms } from "@/lib/studio/queries";
import { createStudioRoom, createStudioRoomMessage } from "@/lib/studio/mutations";
import { buildStarterAssistantMessage } from "@/lib/studio/interview";

const VALID_ROOM_TYPES = ["character", "beat", "scene", "dialogue"];
const VALID_TARGET_TYPES = ["entity", "beat", "scene", "script_excerpt", "story_core"];

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
    const rooms = await getStudioRooms(admin, id);
    return NextResponse.json({ rooms });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load rooms";
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
  const { room_type, target_type, target_id, title, canon_snapshot, locked_facts } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!VALID_ROOM_TYPES.includes(room_type)) {
    return NextResponse.json(
      { error: `room_type must be one of: ${VALID_ROOM_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!VALID_TARGET_TYPES.includes(target_type)) {
    return NextResponse.json(
      { error: `target_type must be one of: ${VALID_TARGET_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const room = await createStudioRoom(admin, id, {
      room_type,
      target_type,
      target_id,
      title,
      canon_snapshot,
      locked_facts,
    });

    await createStudioRoomMessage(admin, room.id, id, {
      role: "assistant",
      content: buildStarterAssistantMessage(room),
      metadata_json: { source: "guided-starter" },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
