import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioShareLinks } from "@/lib/studio/queries";
import { createStudioShareLink } from "@/lib/studio/mutations";

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
    const links = await getStudioShareLinks(admin, id);
    return NextResponse.json({ links });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load share links";
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
  const { access, allow_downloads, expires_at } = body;

  try {
    const admin = createAdminClient();
    const link = await createStudioShareLink(admin, id, { access, allow_downloads, expires_at });
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create share link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
