import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

function generateCode(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabase: null as unknown as Awaited<ReturnType<typeof createClient>>,
      user: null as unknown as NonNullable<typeof user>,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabase: null as unknown as Awaited<ReturnType<typeof createClient>>,
      user: null as unknown as NonNullable<typeof user>,
    };
  }

  return { error: null, supabase, user };
}

// GET /api/admin/invite-codes — List all invite codes
export async function GET() {
  try {
    const rateLimited = await checkRateLimit("admin-invite-codes", 30);
    if (rateLimited) return rateLimited;

    const { error: authError, supabase } = await requireAdmin();
    if (authError) return authError;

    const { data, error } = await supabase
      .from("invite_codes")
      .select(
        `
      id, code, max_uses, use_count, program,
      expires_at, is_active, created_at
    `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ codes: data ?? [] });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/invite-codes — Generate new invite codes
export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-invite-codes", 10);
    if (rateLimited) return rateLimited;

    const { error: authError, supabase, user } = await requireAdmin();
    if (authError) return authError;

    let body: {
      count?: number;
      max_uses?: number;
      expires_at?: string;
      custom_code?: string;
      program?: "general" | "founding_creator";
    };
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const count = Math.max(1, Math.min(Number(body.count ?? 1), 50));
    const maxUses = Math.max(1, Math.min(Number(body.max_uses ?? 1), 10000));
    const expiresAt = body.expires_at ?? null;
    const customCode = body.custom_code?.trim().toUpperCase() ?? null;
    const program = body.program === "founding_creator" ? "founding_creator" : "general";

    // If custom code, create just one
    if (customCode) {
      if (customCode.length < 3 || customCode.length > 32) {
        return NextResponse.json(
          { error: "Custom code must be 3-32 characters" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.from("invite_codes").insert({
        code: customCode,
        max_uses: maxUses,
        expires_at: expiresAt,
        created_by: user.id,
        program,
      }).select();

      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          return NextResponse.json(
            { error: "Code already exists" },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ codes: data });
    }

    // Generate random codes
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push({
        code: generateCode(),
        max_uses: maxUses,
        expires_at: expiresAt,
        created_by: user.id,
        program,
      });
    }

    const { data, error } = await supabase
      .from("invite_codes")
      .insert(codes)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ codes: data ?? [] });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/invite-codes — Update an invite code (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("admin-invite-codes", 20);
    if (rateLimited) return rateLimited;

    const { error: authError, supabase } = await requireAdmin();
    if (authError) return authError;

    let body: { id?: string; is_active?: boolean; max_uses?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.id) {
      return NextResponse.json({ error: "Code id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.max_uses !== undefined) updates.max_uses = Math.max(1, body.max_uses);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("invite_codes")
      .update(updates)
      .eq("id", body.id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ code: data?.[0] ?? null });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
