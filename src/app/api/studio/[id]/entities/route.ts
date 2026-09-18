import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioEntities } from "@/lib/studio/queries";
import { createStudioEntity } from "@/lib/studio/mutations";

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
    const entities = await getStudioEntities(admin, id);
    return NextResponse.json({ entities });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load entities";
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
  const { entity_type, name, summary, tags } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!["character", "location", "prop"].includes(entity_type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const entity = await createStudioEntity(admin, id, { entity_type, name, summary, tags });
    return NextResponse.json({ entity }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create entity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
