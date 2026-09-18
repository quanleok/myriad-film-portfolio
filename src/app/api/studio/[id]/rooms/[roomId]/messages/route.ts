import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioRoom, getStudioRoomMessages } from "@/lib/studio/queries";
import { createStudioRoomMessage } from "@/lib/studio/mutations";
import { buildAssistantFollowUp } from "@/lib/studio/interview";

const VALID_ROLES = ["user", "assistant", "system"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const messages = await getStudioRoomMessages(admin, roomId);
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  const { id, roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { role, content, metadata_json } = body;

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const existingMessages = await getStudioRoomMessages(admin, roomId);
    const message = await createStudioRoomMessage(admin, roomId, id, {
      role,
      content,
      metadata_json,
    });

    let assistantMessage = null;
    if (role === "user") {
      const room = await getStudioRoom(admin, roomId);
      assistantMessage = await createStudioRoomMessage(admin, roomId, id, {
        role: "assistant",
        content: buildAssistantFollowUp(room, [...existingMessages, message], content),
        metadata_json: { source: "guided-follow-up" },
      });
    }

    return NextResponse.json({ message, assistantMessage }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
