import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSeededResourceById } from "@/lib/resources";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { fileUrl } = (await request.json().catch(() => ({ fileUrl: null }))) as {
    fileUrl?: string | null;
  };

  const sample = getSeededResourceById(id);
  if (sample) {
    return NextResponse.json({ ok: true, fileUrl: null, sample: true });
  }

  const admin = createAdminClient();
  const { data: resource } = await admin
    .from("resources")
    .select("download_count")
    .eq("id", id)
    .single();

  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  await admin
    .from("resources")
    .update({ download_count: (resource.download_count ?? 0) + 1 })
    .eq("id", id);

  return NextResponse.json({ ok: true, fileUrl: fileUrl ?? null });
}
