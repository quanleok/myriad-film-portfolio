import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioRoom } from "@/lib/studio/queries";
import { updateStudioRoom } from "@/lib/studio/mutations";

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
    const room = await getStudioRoom(admin, roomId);
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if ("title" in body && typeof body.title === "string") {
    updates.title = body.title.trim();
  }
  if ("locked_facts" in body && Array.isArray(body.locked_facts)) {
    updates.locked_facts = body.locked_facts;
  }
  if ("canon_snapshot" in body && typeof body.canon_snapshot === "object") {
    updates.canon_snapshot = body.canon_snapshot;
  }
  if ("status" in body && ["active", "archived"].includes(body.status)) {
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const room = await updateStudioRoom(admin, roomId, updates);
    return NextResponse.json({ room });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
