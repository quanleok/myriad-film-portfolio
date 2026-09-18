import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkBanned } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteStudioDocument,
  updateStudioDocument,
} from "@/lib/studio/mutations";
import { getStudioDocument, getStudioProject } from "@/lib/studio/queries";

const VALID_KINDS = ["text", "markdown", "fountain", "notes"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await checkBanned(user.id);
  await checkRateLimit("studio-document-save", 60);

  let body: {
    path?: string;
    title?: string;
    kind?: string;
    content?: string;
    summary?: string;
    sort_order?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    await getStudioProject(supabase, id);
    await getStudioDocument(supabase, documentId);

    if (body.kind && !VALID_KINDS.includes(body.kind as any)) {
      return NextResponse.json({ error: `Invalid kind. Must be one of: ${VALID_KINDS.join(", ")}` }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const document = await updateStudioDocument(adminClient, documentId, user.id, {
      path: body.path,
      title: body.title,
      kind: body.kind as typeof VALID_KINDS[number],
      content: body.content,
      sort_order: body.sort_order,
    });

    return NextResponse.json({ document });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await checkBanned(user.id);

  try {
    await getStudioProject(supabase, id);
    await getStudioDocument(supabase, documentId);
    const adminClient = createAdminClient();
    await deleteStudioDocument(adminClient, documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
