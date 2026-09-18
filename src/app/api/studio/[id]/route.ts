import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStudioProject } from "@/lib/studio/queries";
import { updateStudioProject, deleteStudioProject } from "@/lib/studio/mutations";

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
    const project = await getStudioProject(supabase, id);
    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
  const allowed = ["title", "logline", "genre", "format", "status"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  try {
    const project = await updateStudioProject(supabase, id, user.id, updates);
    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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
    await deleteStudioProject(supabase, id, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
