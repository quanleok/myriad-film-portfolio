import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned } from "@/lib/auth-checks";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createStudioChatMessage,
  createStudioChatThread,
  ensureStudioWorkspaceScaffold,
} from "@/lib/studio/mutations";
import {
  getStudioChatMessages,
  getStudioDefaultChatThread,
  getStudioDocuments,
  getStudioProject,
} from "@/lib/studio/queries";

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_API_BASE_URL?.trim() || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

interface ChatRequestBody {
  message?: string;
  selectedDocumentId?: string | null;
  selectedDocumentContent?: string | null;
}

function excerpt(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3).trim()}...`;
}

async function requestDeepSeek(messages: Array<{ role: string; content: string }>) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.7,
      messages,
    }),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `DeepSeek request failed (${response.status})`
    );
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("DeepSeek returned an empty reply.");
  }

  return content;
}

export async function POST(
  request: Request,
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

  await checkBanned(user.id);
  await checkRateLimit("studio-chat", 20);

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "Missing DEEPSEEK_API_KEY on the server." },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message || message.length > 10000) {
    return NextResponse.json({ error: "Message is required and must be under 10,000 characters." }, { status: 400 });
  }

  try {
    const project = await getStudioProject(supabase, id);
    const adminClient = createAdminClient();
    await ensureStudioWorkspaceScaffold(adminClient, {
      projectId: id,
      userId: user.id,
      title: project.title,
      logline: project.logline,
    });

    const documents = await getStudioDocuments(supabase, id);
    let thread = await getStudioDefaultChatThread(supabase, id);

    if (!thread) {
      thread = await createStudioChatThread(adminClient, id, user.id, {
        title: "Main thread",
        is_default: true,
      });
    }

    const recentMessages = await getStudioChatMessages(supabase, thread.id);
    const selectedDocument =
      documents.find((document) => document.id === body.selectedDocumentId) ??
      documents[0] ??
      null;

    const fileIndex = documents
      .map(
        (document) =>
          `- ${document.path}: ${excerpt(document.content, 120) || "empty"}`
      )
      .join("\n");

    const selectedDocumentContext = selectedDocument
      ? `Selected document: ${selectedDocument.path}\n\n${excerpt(
          body.selectedDocumentContent?.trim() || selectedDocument.content,
          7000
        )}`
      : "No document is selected.";

    const systemMessages = [
      {
        role: "system",
        content:
          "You are a direct, high-signal screenwriting collaborator inside a file-based writing workspace. Help the user write the film. Prefer concrete suggestions over generic advice. If you reference edits, mention which file path to edit. Do not claim you edited files unless the user explicitly says they pasted your text in.",
      },
      {
        role: "system",
        content: [
          `Project: ${project.title}`,
          project.logline ? `Logline: ${project.logline}` : null,
          "",
          "Current files:",
          fileIndex || "- No files yet",
          "",
          selectedDocumentContext,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ];

    const conversation = recentMessages.slice(-10).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    const userMessage = await createStudioChatMessage(
      adminClient,
      thread.id,
      id,
      user.id,
      {
        role: "user",
        content: message,
        referenced_document_ids: selectedDocument ? [selectedDocument.id] : [],
      }
    );

    const reply = await requestDeepSeek([
      ...systemMessages,
      ...conversation,
      { role: "user", content: message },
    ]);

    const assistantMessage = await createStudioChatMessage(
      adminClient,
      thread.id,
      id,
      null,
      {
        role: "assistant",
        content: reply,
        referenced_document_ids: selectedDocument ? [selectedDocument.id] : [],
      }
    );

    return NextResponse.json({
      thread,
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error("[studio-chat]", error);
    return NextResponse.json({ error: "Failed to send chat message" }, { status: 500 });
  }
}
