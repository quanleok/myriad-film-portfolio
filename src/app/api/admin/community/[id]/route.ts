import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { is_approved } = body;

  if (typeof is_approved !== "boolean") {
    return NextResponse.json({ error: "is_approved must be a boolean" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("community_posts")
    .update({ is_approved })
    .eq("id", id)
    .select("id, is_approved")
    .single();

  if (error) {
    console.error("Admin showcase PATCH error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}
