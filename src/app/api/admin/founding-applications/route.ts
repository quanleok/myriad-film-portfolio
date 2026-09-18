import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantFoundingCreatorAccess } from "@/lib/founding-program-server";
import { checkRateLimit } from "@/lib/rate-limit";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null as string | null,
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
      user: null as string | null,
    };
  }

  return { error: null, user: user.id };
}

export async function GET() {
  const rateLimited = await checkRateLimit("admin-founding-applications", 30);
  if (rateLimited) return rateLimited;

  const { error } = await requireAdmin();
  if (error) return error;

  const adminSupabase = createAdminClient();
  const { data, error: queryError } = await adminSupabase
    .from("founding_applications")
    .select("id, user_id, email, display_name, invite_code, portfolio_link, ai_tools, status, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(request: NextRequest) {
  const rateLimited = await checkRateLimit("admin-founding-applications-action", 20);
  if (rateLimited) return rateLimited;

  const { error, user: adminUserId } = await requireAdmin();
  if (error) return error;

  let body: { applicationId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const applicationId =
    typeof body.applicationId === "string" ? body.applicationId.trim() : "";
  const action = body.action === "approve" || body.action === "reject" ? body.action : null;

  if (!applicationId || !action) {
    return NextResponse.json({ error: "applicationId and action are required" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: application } = await adminSupabase
    .from("founding_applications")
    .select("id, user_id, status")
    .eq("id", applicationId)
    .single();

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status !== "pending") {
    return NextResponse.json({ error: "Application has already been reviewed" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const nextStatus = action === "approve" ? "approved" : "rejected";

  const { error: updateError } = await adminSupabase
    .from("founding_applications")
    .update({
      status: nextStatus,
      reviewed_at: now,
    })
    .eq("id", applicationId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === "approve" && application.user_id) {
    try {
      await grantFoundingCreatorAccess({
        userId: application.user_id,
        source: "application",
      });
    } catch (grantError) {
      const message =
        grantError instanceof Error ? grantError.message : "Could not grant founding access";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, reviewedBy: adminUserId });
}
