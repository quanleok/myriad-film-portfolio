import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/studio/[id]/assets?tab=character&folder=FolderName
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab");
  const folder = url.searchParams.get("folder");

  try {
    const admin = createAdminClient();
    let query = admin
      .from("studio_assets")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (tab) query = query.eq("tab", tab);
    if (folder) query = query.eq("folder_path", folder);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ assets: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load assets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/studio/[id]/assets — upload image via FormData
// Fields: file (File), tab (character|location|prop), folder_path (string), title? (string)
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const tab = formData.get("tab") as string;
  const folderPath = formData.get("folder_path") as string;
  const title = (formData.get("title") as string) || file?.name || "Untitled";

  if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
  if (!["character", "location", "prop"].includes(tab)) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }
  if (!folderPath?.trim()) {
    return NextResponse.json({ error: "folder_path is required" }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
  }

  // 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  try {
    const ext = file.name.split(".").pop() || "png";
    const storageKey = `studio-assets/${id}/${tab}/${folderPath}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from("studio")
      .upload(storageKey, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = admin.storage.from("studio").getPublicUrl(storageKey);

    const { data: asset, error: insertError } = await admin
      .from("studio_assets")
      .insert({
        project_id: id,
        asset_type: "image",
        title: title.trim(),
        description: "",
        source_url: publicUrl,
        storage_key: storageKey,
        tab,
        folder_path: folderPath.trim(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/studio/[id]/assets — body: { assetId: string }
export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Verify ownership
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { assetId } = await request.json();
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  try {
    // Get asset to find storage key
    const { data: asset } = await admin
      .from("studio_assets")
      .select("storage_key")
      .eq("id", assetId)
      .eq("project_id", id)
      .single();

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Delete from storage
    if (asset.storage_key) {
      await admin.storage.from("studio").remove([asset.storage_key]);
    }

    // Delete from DB
    const { error } = await admin
      .from("studio_assets")
      .delete()
      .eq("id", assetId)
      .eq("project_id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
