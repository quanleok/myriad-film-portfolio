import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStudioChatMessages,
  getStudioDefaultChatThread,
  getStudioDocuments,
  getStudioProject,
} from "@/lib/studio/queries";
import { ensureStudioWorkspaceScaffold } from "@/lib/studio/mutations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  try {
    const project = await getStudioProject(adminClient, id);

    // Verify ownership
    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let documents = await getStudioDocuments(adminClient, id);
    let thread = await getStudioDefaultChatThread(adminClient, id);

    if (!documents.length || !thread) {
      await ensureStudioWorkspaceScaffold(adminClient, {
        projectId: id,
        userId: user.id,
        title: project.title,
        logline: project.logline,
      });

      [documents, thread] = await Promise.all([
        getStudioDocuments(adminClient, id),
        getStudioDefaultChatThread(adminClient, id),
      ]);
    }

    const messages = thread
      ? await getStudioChatMessages(adminClient, thread.id)
      : [];

    return NextResponse.json({
      project,
      documents,
      thread,
      messages,
    });
  } catch (error) {
    console.error("[workspace-shell]", error);
    const message =
      error instanceof Error ? error.message : "Failed to load workspace";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
