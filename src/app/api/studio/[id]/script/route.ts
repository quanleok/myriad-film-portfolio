import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudioScript } from "@/lib/studio/queries";
import { saveStudioScript } from "@/lib/studio/mutations";
import { checkRateLimit } from "@/lib/rate-limit";

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
    const script = await getStudioScript(admin, id);
    return NextResponse.json({ script });
  } catch {
    return NextResponse.json({ error: "Script not found" }, { status: 404 });
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

  await checkRateLimit("studio-script-save", 30);

  const body = await request.json();
  const { content } = body;

  if (typeof content !== "string") {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const script = await saveStudioScript(admin, id, content);
    return NextResponse.json({ script });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save script";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
