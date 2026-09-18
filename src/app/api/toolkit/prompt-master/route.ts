import { NextResponse } from "next/server";

export const runtime = "nodejs";

function stripJsonFences(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractText(content: Array<{ type: string; text?: string }>) {
  return content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

const MODEL_GUIDANCE: Record<string, string> = {
  "seedance-2": "Prioritize highly visual, cinematic motion language and continuity cues for Seedance 2.",
  "kling-2.1": "Favor detailed subject motion, camera movement, and environment language suitable for Kling 2.1.",
  "runway-gen-4": "Write prompts with concise but vivid staging, motion, lighting, and composition for Runway Gen-4.",
  sora: "Lean into physical plausibility, shot design, and naturalistic detail for Sora.",
  "wan-2.1": "Favor strong visual specificity, concise scene intent, and practical motion direction for Wan 2.1.",
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured for Toolkit yet." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    script?: string;
    model?: string;
    sceneDuration?: number;
    mode?: "scene";
    sceneNumber?: number;
    sceneDescription?: string;
  };

  const script = body.script?.trim();
  const model = body.model?.trim() || "seedance-2";
  const sceneDuration = Number(body.sceneDuration || 15);

  if (!script) {
    return NextResponse.json({ error: "Script is required." }, { status: 400 });
  }

  const isSingleScene = body.mode === "scene" && body.sceneNumber && body.sceneDescription?.trim();

  const systemPrompt = isSingleScene
    ? [
        "You are an AI video pre-production assistant.",
        "Return strict JSON only.",
        "Regenerate exactly one scene prompt from the provided scene description and script context.",
        "Return this shape only:",
        '{"scene":{"number":1,"description":"string","prompt":"string","duration_seconds":15}}',
      ].join(" ")
    : [
        "You are an AI video pre-production assistant.",
        "Break the provided script into scene-sized prompt units for video generation.",
        "Return strict JSON only with no markdown or commentary.",
        'Return this shape only: {"scenes":[{"number":1,"description":"string","prompt":"string","duration_seconds":15}]}',
        "Each prompt should be written for the selected model and should focus on camera language, blocking, setting, lighting, action, continuity, and visual specificity.",
      ].join(" ");

  const userPrompt = isSingleScene
    ? [
        `Target model: ${model}. ${MODEL_GUIDANCE[model] ?? ""}`,
        `Preferred scene duration: ${sceneDuration} seconds.`,
        `Full script context:\n${script}`,
        `Regenerate scene ${body.sceneNumber} using this description:\n${body.sceneDescription}`,
      ].join("\n\n")
    : [
        `Target model: ${model}. ${MODEL_GUIDANCE[model] ?? ""}`,
        `Preferred scene duration: ${sceneDuration} seconds.`,
        "Break the following script into scenes of roughly that duration.",
        "Each scene needs a short description and an immediately usable prompt.",
        `Script:\n${script}`,
      ].join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_TOOLKIT_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 2400,
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }],
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (!response.ok || !payload.content) {
    return NextResponse.json(
      { error: payload.error?.message ?? "Anthropic request failed." },
      { status: response.status || 500 }
    );
  }

  const text = stripJsonFences(extractText(payload.content));

  try {
    const parsed = JSON.parse(text) as {
      scenes?: Array<{
        number: number;
        description: string;
        prompt: string;
        duration_seconds: number;
      }>;
      scene?: {
        number: number;
        description: string;
        prompt: string;
        duration_seconds: number;
      };
    };

    if (isSingleScene && parsed.scene) {
      return NextResponse.json({ scene: parsed.scene });
    }

    if (parsed.scenes) {
      return NextResponse.json({ scenes: parsed.scenes });
    }

    throw new Error("Toolkit returned an unexpected scene payload.");
  } catch {
    return NextResponse.json(
      {
        error:
          "Toolkit could not parse the model response. Try again with a shorter script or regenerate.",
      },
      { status: 500 }
    );
  }
}
