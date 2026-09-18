import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

// GET /api/studio/[id]/documents — list all documents for a project
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("studio_documents")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

// POST /api/studio/[id]/documents — create a document or folder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await checkRateLimit("studio-doc-create", 30);

  const body = await request.json();
  const { path, title, content, kind, is_folder, parent_path, sort_order } = body;

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("studio_documents")
    .insert({
      project_id: id,
      path,
      title: title || path.split("/").pop() || "",
      content: content || "",
      kind: kind || "text",
      is_folder: is_folder || false,
      parent_path: parent_path ?? null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}

// PATCH /api/studio/[id]/documents — update a document (by path in body)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await checkRateLimit("studio-doc-save", 60);

  const body = await request.json();
  const { document_id, content, title, path, sort_order } = body;

  if (!document_id) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (content !== undefined) updates.content = content;
  if (title !== undefined) updates.title = title;
  if (path !== undefined) updates.path = path;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const { data, error } = await admin
    .from("studio_documents")
    .update(updates)
    .eq("id", document_id)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data });
}

// DELETE /api/studio/[id]/documents — delete a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { document_id } = body;

  if (!document_id) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: project } = await admin
    .from("studio_projects")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If deleting a folder, delete all children too
  const { data: doc } = await admin
    .from("studio_documents")
    .select("path, is_folder")
    .eq("id", document_id)
    .eq("project_id", id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (doc.is_folder) {
    // Delete children with matching parent_path
    await admin
      .from("studio_documents")
      .delete()
      .eq("project_id", id)
      .eq("parent_path", doc.path);
  }

  const { error } = await admin
    .from("studio_documents")
    .delete()
    .eq("id", document_id)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
