import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { randomUUID } from "crypto";

// POST /api/workshop/[id]/share — generate/regenerate share token
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-share", 10);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  const { data: project } = await supabase
    .from("workshop_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const shareToken = randomUUID().replace(/-/g, "").slice(0, 24);

  const { data: updated, error } = await supabase
    .from("workshop_projects")
    .update({ share_token: shareToken, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("share_token")
    .single();

  if (error) {
    console.error("[api] workshop share error:", error);
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }

  return NextResponse.json({ share_token: updated.share_token });
}
