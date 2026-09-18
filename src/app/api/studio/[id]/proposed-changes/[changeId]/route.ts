import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptStudioProposedChange, rejectStudioProposedChange } from "@/lib/studio/mutations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; changeId: string }> }
) {
  const { changeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const change = action === "accept"
      ? await acceptStudioProposedChange(admin, changeId)
      : await rejectStudioProposedChange(admin, changeId);

    return NextResponse.json({ change });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update change";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
