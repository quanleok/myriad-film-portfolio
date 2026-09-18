import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantFoundingCreatorAccess } from "@/lib/founding-program-server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimited = await checkRateLimit("founding-redeem", 10);
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("is_founding_creator")
    .eq("id", user.id)
    .single();

  if (profile?.is_founding_creator) {
    return NextResponse.json({ success: true, alreadyApplied: true });
  }

  const { data: invite } = await adminSupabase
    .from("invite_codes")
    .select("id, code, max_uses, use_count, expires_at, is_active, program")
    .eq("code", code)
    .eq("program", "founding_creator")
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invalid founding creator invite code" }, { status: 400 });
  }

  if (!invite.is_active) {
    return NextResponse.json({ error: "Invite code is no longer active" }, { status: 400 });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
  }

  if (invite.max_uses && invite.use_count >= invite.max_uses) {
    return NextResponse.json({ error: "Invite code has been fully redeemed" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: updatedInvite, error: updateInviteError } = await adminSupabase
    .from("invite_codes")
    .update({
      use_count: invite.use_count + 1,
      used_by: user.id,
      used_at: now,
    })
    .eq("id", invite.id)
    .lt("use_count", invite.max_uses ?? 999999999)
    .select("id")
    .maybeSingle();

  if (updateInviteError || !updatedInvite) {
    return NextResponse.json({ error: "Invite code is no longer valid" }, { status: 400 });
  }

  try {
    await grantFoundingCreatorAccess({
      userId: user.id,
      source: "invite_code",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not activate founding access";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
