import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioProjects } from "@/lib/studio/queries";
import { createStudioProject } from "@/lib/studio/mutations";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await getStudioProjects(supabase, user.id);
    return NextResponse.json({ projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, logline, genre, format } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const adminClient = createAdminClient();
    const project = await createStudioProject(adminClient, user.id, { title, logline, genre, format });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string; details?: string; code?: string };
    console.error("Studio project creation error:", e);
    const message = e?.message || "Failed to create project";
    return NextResponse.json({ error: message, details: e?.details }, { status: 500 });
  }
}
