import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

function parseAiTools(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);
}

export async function POST(request: NextRequest) {
  const rateLimited = await checkRateLimit("founding-apply", 5);
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_founding_creator")
    .eq("id", user.id)
    .single();

  if (profile?.is_founding_creator) {
    return NextResponse.json({ error: "You are already in the program" }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from("founding_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const message =
      existing.status === "approved"
        ? "Your founding creator application is already approved."
        : "You already have a pending founding creator application.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  let body: { displayName?: unknown; portfolioLink?: unknown; aiTools?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const displayName =
    typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim().slice(0, 80)
      : profile?.display_name?.trim() || user.email?.split("@")[0] || "Applicant";

  const portfolioLink =
    typeof body.portfolioLink === "string" && body.portfolioLink.trim()
      ? body.portfolioLink.trim().slice(0, 400)
      : null;

  const aiTools = parseAiTools(body.aiTools);

  const { error } = await supabase.from("founding_applications").insert({
    user_id: user.id,
    email: user.email ?? "",
    display_name: displayName,
    invite_code: null,
    portfolio_link: portfolioLink,
    ai_tools: aiTools,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
