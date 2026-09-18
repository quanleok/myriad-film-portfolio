import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/studio/[id]/assets/folders?tab=character
// Returns distinct folder names for a tab
export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab");
  if (!tab) return NextResponse.json({ error: "tab is required" }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("studio_assets")
      .select("folder_path")
      .eq("project_id", id)
      .eq("tab", tab)
      .neq("folder_path", "");

    if (error) throw error;

    // Get unique folder names
    const folders = [...new Set((data || []).map((r) => r.folder_path))].sort();
    return NextResponse.json({ folders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load folders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/studio/[id]/assets/folders — create a folder placeholder
// Body: { tab, folder_path }
// We insert a placeholder asset row so the folder shows up even when empty
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tab, folder_path } = await request.json();
  if (!["character", "location", "prop"].includes(tab)) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }
  if (!folder_path?.trim()) {
    return NextResponse.json({ error: "folder_path is required" }, { status: 400 });
  }

  try {
    // Check if folder already exists
    const { data: existing } = await admin
      .from("studio_assets")
      .select("id")
      .eq("project_id", id)
      .eq("tab", tab)
      .eq("folder_path", folder_path.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
    }

    // Insert placeholder row (asset_type = "document" to mark it as a folder marker)
    const { data: asset, error } = await admin
      .from("studio_assets")
      .insert({
        project_id: id,
        asset_type: "document",
        title: `__folder__${folder_path.trim()}`,
        description: "",
        tab,
        folder_path: folder_path.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ folder: folder_path.trim(), marker: asset }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/studio/[id]/assets/folders — delete folder and all its assets
// Body: { tab, folder_path }
export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tab, folder_path } = await request.json();
  if (!tab || !folder_path) {
    return NextResponse.json({ error: "tab and folder_path required" }, { status: 400 });
  }

  try {
    // Get all assets in this folder to delete storage files
    const { data: assets } = await admin
      .from("studio_assets")
      .select("storage_key")
      .eq("project_id", id)
      .eq("tab", tab)
      .eq("folder_path", folder_path);

    // Delete storage files
    const keys = (assets || [])
      .map((a) => a.storage_key)
      .filter((k): k is string => !!k);
    if (keys.length > 0) {
      await admin.storage.from("studio").remove(keys);
    }

    // Delete all DB rows in this folder
    const { error } = await admin
      .from("studio_assets")
      .delete()
      .eq("project_id", id)
      .eq("tab", tab)
      .eq("folder_path", folder_path);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/studio/[id]/assets/folders — rename folder
// Body: { tab, old_name, new_name }
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tab, old_name, new_name } = await request.json();
  if (!tab || !old_name?.trim() || !new_name?.trim()) {
    return NextResponse.json({ error: "tab, old_name, new_name required" }, { status: 400 });
  }

  try {
    const { error } = await admin
      .from("studio_assets")
      .update({ folder_path: new_name.trim() })
      .eq("project_id", id)
      .eq("tab", tab)
      .eq("folder_path", old_name.trim());

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to rename folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
