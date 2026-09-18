import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioVersions } from "@/lib/studio/queries";
import { createStudioVersion } from "@/lib/studio/mutations";

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
    const versions = await getStudioVersions(admin, id);
    return NextResponse.json({ versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load versions";
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
  const { label, summary } = body;

  if (!label?.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const version = await createStudioVersion(admin, id, user.id, { label, summary });
    return NextResponse.json({ version }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create version";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
