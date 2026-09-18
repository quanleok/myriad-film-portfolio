import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStudioProject } from "@/lib/studio/queries";
import type { SeedBoard, WritePhase } from "@/lib/studio/script-workspace";

type AssistantMode = "clarify" | "reframe" | "alternatives" | "sync";
type StorySelectionKind =
  | "story-kickoff"
  | "seed-box"
  | "character"
  | "world"
  | "unresolved";

interface AssistantRequestBody {
  phase: WritePhase;
  mode: AssistantMode;
  selectionKind?: string;
  selectionLabel: string;
  selectionContext: string;
  behaviorPrompt: string;
  projectTitle: string;
  projectLogline: string;
  userMessage?: string;
  kickoff?: boolean;
  seedBoard?: SeedBoard;
  thread?: Array<{ role: "assistant" | "user"; content: string }>;
}

interface SeedAssistantPatch {
  summary?: string | null;
  kickoffIdea?: string | null;
  boxUpdates?: Record<string, string | null>;
  characterUpdates?: Record<
    string,
    {
      name?: string | null;
      role?: string | null;
      want?: string | null;
      conflict?: string | null;
    }
  >;
  worldUpdates?: Record<string, string | null>;
  unresolvedUpdates?: Record<string, string | null>;
}

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_API_BASE_URL?.trim() || "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}

function extractJsonObject(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Record<
        string,
        unknown
      >;
    } catch {
      return null;
    }
  }
}

function normalizeSeedPatch(raw: Record<string, unknown>) {
  const patch: SeedAssistantPatch = {};
  const summary = stringOrNull(raw.summary);
  const kickoffIdea = stringOrNull(raw.kickoff_idea);
  const boxUpdates =
    raw.box_updates && typeof raw.box_updates === "object"
      ? (raw.box_updates as Record<string, unknown>)
      : null;
  const characterUpdates =
    raw.character_updates && typeof raw.character_updates === "object"
      ? (raw.character_updates as Record<string, unknown>)
      : null;
  const worldUpdates =
    raw.world_updates && typeof raw.world_updates === "object"
      ? (raw.world_updates as Record<string, unknown>)
      : null;
  const unresolvedUpdates =
    raw.unresolved_updates && typeof raw.unresolved_updates === "object"
      ? (raw.unresolved_updates as Record<string, unknown>)
      : null;

  if (summary) patch.summary = summary;
  if (kickoffIdea) patch.kickoffIdea = kickoffIdea;

  if (boxUpdates) {
    patch.boxUpdates = Object.fromEntries(
      Object.entries(boxUpdates).map(([key, value]) => [
        key,
        stringOrNull(value),
      ]),
    );
  }

  if (characterUpdates) {
    patch.characterUpdates = Object.fromEntries(
      Object.entries(characterUpdates).map(([key, value]) => {
        const fields =
          value && typeof value === "object"
            ? (value as Record<string, unknown>)
            : {};
        return [
          key,
          {
            name: stringOrNull(fields.name),
            role: stringOrNull(fields.role),
            want: stringOrNull(fields.want),
            conflict: stringOrNull(fields.conflict),
          },
        ];
      }),
    );
  }

  if (worldUpdates) {
    patch.worldUpdates = Object.fromEntries(
      Object.entries(worldUpdates).map(([key, value]) => [
        key,
        stringOrNull(value),
      ]),
    );
  }

  if (unresolvedUpdates) {
    patch.unresolvedUpdates = Object.fromEntries(
      Object.entries(unresolvedUpdates).map(([key, value]) => [
        key,
        stringOrNull(value),
      ]),
    );
  }

  return patch;
}

function normalizeSuggestedSelection(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;

  const selection = raw as Record<string, unknown>;
  const kind = stringOrNull(selection.kind);
  const id = stringOrNull(selection.id);

  if (!kind || !id) return null;

  if (
    !["story-kickoff", "seed-box", "character", "world", "unresolved"].includes(
      kind,
    )
  ) {
    return null;
  }

  return {
    kind: kind as StorySelectionKind,
    id,
  };
}

async function requestDeepSeek(
  messages: Array<{ role: string; content: string }>,
  temperature: number,
) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature,
      messages,
    }),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
    usage?: Record<string, unknown>;
  } | null;

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `DeepSeek request failed (${response.status})`,
    );
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("DeepSeek returned an empty assistant reply.");
  }

  return { content, usage: data?.usage ?? null };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "Missing DEEPSEEK_API_KEY on the server." },
      { status: 500 },
    );
  }

  let body: AssistantRequestBody;
  try {
    body = (await request.json()) as AssistantRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const isSeedKickoff = body.phase === "seed" && body.kickoff === true;
  const userMessage = body.userMessage?.trim() || "";

  if (!userMessage && !isSeedKickoff) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    await getStudioProject(admin, id);

    if (body.phase === "seed") {
      const boardContext = JSON.stringify(
        {
          kickoffIdea: body.seedBoard?.kickoffIdea || "",
          summary: body.seedBoard?.summary || "",
          boxes:
            body.seedBoard?.boxes.map(({ id, label, value, status }) => ({
              id,
              label,
              value,
              status,
            })) ?? [],
          characters:
            body.seedBoard?.characters.map(
              ({ id, name, role, want, conflict, status }) => ({
                id,
                name,
                role,
                want,
                conflict,
                status,
              }),
            ) ?? [],
          world:
            body.seedBoard?.world.map(({ id, label, value, status }) => ({
              id,
              label,
              value,
              status,
            })) ?? [],
          unresolved:
            body.seedBoard?.unresolved.map(({ id, label, note }) => ({
              id,
              label,
              note,
            })) ?? [],
        },
        null,
        2,
      );

      const { content, usage } = await requestDeepSeek(
        [
          {
            role: "system",
            content: [
              "You are the chat-first story kickoff AI inside Myriad Studio.",
              "Your job is to help a solo filmmaker clarify a movie one sharp question at a time.",
              "Do not rewrite the whole story.",
              "Update only the fields the user actually clarified.",
              "Stay conservative. If something is still unclear, leave it unresolved.",
            ].join(" "),
          },
          {
            role: "system",
            content: [
              `Project title: ${body.projectTitle}.`,
              `Project logline: ${body.projectLogline || "No logline yet."}`,
              `Selection kind: ${body.selectionKind || "story-kickoff"}.`,
              `Selection label: ${body.selectionLabel}.`,
              `Selection context: ${body.selectionContext}.`,
              `Behavior instruction: ${body.behaviorPrompt}`,
              "The Story board currently looks like this:",
              boardContext,
            ].join("\n"),
          },
          {
            role: "system",
            content: [
              "Return ONLY a JSON object with this exact shape:",
              "{",
              '  "reply": "assistant message shown to the user",',
              '  "summary": "1-2 sentence story snapshot or null",',
              '  "kickoff_idea": "updated kickoff idea or null",',
              '  "box_updates": {',
              '    "premise": "string or null",',
              '    "protagonist": "string or null",',
              '    "goal": "string or null",',
              '    "conflict": "string or null",',
              '    "tone": "string or null",',
              '    "ending": "string or null",',
              '    "runtime": "string or null"',
              "  },",
              '  "character_updates": {',
              '    "character-lead": {',
              '      "name": "string or null",',
              '      "role": "string or null",',
              '      "want": "string or null",',
              '      "conflict": "string or null"',
              "    }",
              "  },",
              '  "world_updates": {',
              '    "world-setting": "string or null",',
              '    "world-rules": "string or null",',
              '    "world-hook": "string or null"',
              "  },",
              '  "unresolved_updates": {',
              '    "unresolved-opposition": "string or null"',
              "  },",
              '  "suggested_selection": { "kind": "story-kickoff|seed-box|character|world|unresolved", "id": "string" }',
              "}",
              "The reply must ask only one useful next question unless the user explicitly asked for options.",
              "If kickoff just started, ask the single best first question and leave most fields null.",
            ].join("\n"),
          },
          ...(body.thread ?? []).slice(-10),
          {
            role: "user",
            content: isSeedKickoff
              ? "Start the story kickoff now."
              : userMessage,
          },
        ],
        isSeedKickoff ? 0.35 : body.mode === "alternatives" ? 0.8 : 0.45,
      );

      const parsed = extractJsonObject(content);
      if (!parsed) {
        return NextResponse.json({
          reply: content,
          seedPatch: null,
          suggestedSelection: null,
          model: DEEPSEEK_MODEL,
          usage,
        });
      }

      return NextResponse.json({
        reply:
          stringOrNull(parsed.reply) ||
          "Keep going one answer at a time until the Story board becomes solid.",
        seedPatch: normalizeSeedPatch(parsed),
        suggestedSelection: normalizeSuggestedSelection(
          parsed.suggested_selection,
        ),
        model: DEEPSEEK_MODEL,
        usage,
      });
    }

    const { content, usage } = await requestDeepSeek(
      [
        {
          role: "system",
          content: [
            "You are the AI writing partner inside Myriad Studio.",
            "This product is for solo filmmakers building a script phase by phase.",
            "Be concise, practical, and scoped to the selected object.",
            "Do not rewrite the whole movie.",
            "Ask one sharp question at a time unless the user explicitly asks for options.",
            "If the user seems unsure, offer 3 concrete options and recommend one.",
            "Treat locked canon as stable and avoid inventing unrelated changes.",
          ].join(" "),
        },
        {
          role: "system",
          content: [
            `Current phase: ${body.phase}.`,
            `Selected object: ${body.selectionLabel}.`,
            `Project title: ${body.projectTitle}.`,
            `Project logline: ${body.projectLogline || "No logline yet."}`,
            `Current object context: ${body.selectionContext || "No current context provided."}`,
            `Behavior instruction: ${body.behaviorPrompt}`,
          ].join("\n"),
        },
        ...(body.thread ?? []).slice(-8),
        {
          role: "user",
          content: userMessage,
        },
      ],
      body.mode === "alternatives" ? 0.9 : 0.5,
    );

    return NextResponse.json({
      reply: content,
      model: DEEPSEEK_MODEL,
      usage,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run Studio assistant.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
