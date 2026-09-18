import type { Json } from "@/types/database";
import {
  CHARACTER_OUTPUT_OPTIONS,
  type CharacterOutputType,
  getOutputOption,
  isCharacterOutputType,
  isImageOutputType,
  outputTypeLabel,
} from "@/lib/toolkit/character-sheet-config";

export interface CharacterDescriptionAnalysis {
  physical: {
    gender: string;
    age_estimate: string;
    build: string;
    height_estimate: string;
    skin_tone: string;
    face_shape: string;
  };
  hair: {
    style: string;
    color: string;
    length: string;
  };
  eyes: {
    color: string;
    shape: string;
  };
  clothing: {
    top: string;
    bottom: string;
    footwear: string;
    accessories: string;
  };
  distinguishing_features: string[];
  colors: string[];
  prompt_block: string;
}

export interface CharacterPaletteEntry {
  hex: string;
  name: string;
  location?: string;
}

export interface CharacterPaletteAnalysis {
  skin?: CharacterPaletteEntry | null;
  hair?: CharacterPaletteEntry | null;
  eyes?: CharacterPaletteEntry | null;
  clothing_primary?: CharacterPaletteEntry | null;
  clothing_secondary?: CharacterPaletteEntry | null;
  accent?: CharacterPaletteEntry | null;
  all_colors: CharacterPaletteEntry[];
}

export interface CharacterOutputMetadata {
  sourceImageUrl?: string | null;
  sourceImageStorageKey?: string | null;
  prompt?: string;
  provider?: string;
  mediaType?: string;
  storageKey?: string | null;
  analysis?: CharacterDescriptionAnalysis;
  palette?: CharacterPaletteAnalysis;
}

export function normalizeCharacterName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function serializeHint(hint?: string | null) {
  const trimmed = hint?.trim();
  return trimmed ? `Additional context: ${trimmed}` : "No extra user hints were provided.";
}

export function getDescriptionSystemPrompt(hint?: string | null) {
  return [
    "Analyze this character image in detail and return only strict JSON.",
    "Use this exact shape:",
    '{"physical":{"gender":"...","age_estimate":"...","build":"...","height_estimate":"...","skin_tone":"...","face_shape":"..."},"hair":{"style":"...","color":"...","length":"..."},"eyes":{"color":"...","shape":"..."},"clothing":{"top":"...","bottom":"...","footwear":"...","accessories":"..."},"distinguishing_features":["..."],"colors":["#hex1","#hex2","#hex3","#hex4","#hex5","#hex6"],"prompt_block":"A prompt-ready paragraph under 150 words."}',
    "Be concrete and prompt-friendly. Keep arrays and nested objects complete.",
    serializeHint(hint),
  ].join(" ");
}

export function getPaletteSystemPrompt(hint?: string | null) {
  return [
    "Analyze this character image and return only strict JSON.",
    "Use this exact shape:",
    '{"skin":{"hex":"#...","name":"..."},"hair":{"hex":"#...","name":"..."},"eyes":{"hex":"#...","name":"..."},"clothing_primary":{"hex":"#...","name":"..."},"clothing_secondary":{"hex":"#...","name":"..."},"accent":{"hex":"#...","name":"..."},"all_colors":[{"hex":"#...","name":"...","location":"..."}]}',
    "Return as many useful all_colors entries as needed, but keep them specific and practical for production design.",
    serializeHint(hint),
  ].join(" ");
}

export function getImagePrompt({
  type,
  characterName,
  hint,
}: {
  type: Extract<CharacterOutputType, "fullbody" | "sheet" | "expression" | "closeup">;
  characterName?: string | null;
  hint?: string | null;
}) {
  const namePrefix = characterName?.trim() ? `${characterName.trim()}, ` : "same character, ";
  const hintText = hint?.trim() ? `Additional direction: ${hint.trim()}.` : "";

  switch (type) {
    case "fullbody":
      return `${namePrefix}full body view, standing pose, same wardrobe language, same face and features, white backdrop, character concept art reference. ${hintText}`.trim();
    case "sheet":
      return `${namePrefix}character turnaround sheet with front view, three-quarter view, side view, and back view on one clean reference image, white background, design-sheet layout, consistent proportions. ${hintText}`.trim();
    case "expression":
      return `${namePrefix}expression sheet in a clean grid with neutral, happy, angry, sad, surprised, and determined expressions, same features across all panels, white background, character reference layout. ${hintText}`.trim();
    case "closeup":
      return `${namePrefix}extreme close-up portrait, detailed facial features, same skin tone, same eye color, same hair, cinematic lighting, high detail, sharp focus. ${hintText}`.trim();
  }
}

export function stripJsonFences(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function extractAnthropicText(content: Array<{ type: string; text?: string }>) {
  return content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

export function toBase64(arrayBuffer: ArrayBuffer) {
  return Buffer.from(arrayBuffer).toString("base64");
}

export async function fetchRemoteImageAsBase64(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load the reference image.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const mediaType = response.headers.get("content-type") || "image/png";

  return {
    base64: toBase64(arrayBuffer),
    mediaType,
  };
}

export async function requestAnthropicJson<T>({
  imageBase64,
  mediaType,
  systemPrompt,
}: {
  imageBase64: string;
  mediaType: string;
  systemPrompt: string;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured for Toolkit yet.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_TOOLKIT_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 2200,
      temperature: 0.35,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (!response.ok || !payload.content) {
    throw new Error(payload.error?.message ?? "Anthropic vision request failed.");
  }

  const parsed = JSON.parse(stripJsonFences(extractAnthropicText(payload.content))) as T;
  return parsed;
}

export async function requestCharacterImageGeneration({
  imageUrl,
  prompt,
  outputType,
}: {
  imageUrl: string;
  prompt: string;
  outputType: Extract<CharacterOutputType, "fullbody" | "sheet" | "expression" | "closeup">;
}) {
  const apiUrl = process.env.NANO_BANANA_API_URL?.trim();
  const apiKey = process.env.NANO_BANANA_API_KEY?.trim();

  if (!apiUrl || !apiKey) {
    throw new Error("Nano Banana Pro is not configured for image outputs yet.");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: process.env.NANO_BANANA_MODEL || "nano-banana-pro",
      imageUrl,
      prompt,
      outputType,
    }),
  });

  const payload = (await response.json()) as
    | {
        imageUrl?: string;
        image_url?: string;
        url?: string;
        imageBase64?: string;
        image_base64?: string;
        mediaType?: string;
        media_type?: string;
        metadata?: Json;
        error?: string;
      }
    | {
        data?: Array<{ url?: string; b64_json?: string }>;
        error?: { message?: string };
      };

  if (!response.ok) {
    const message =
      "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "error" in payload && payload.error && typeof payload.error === "object"
          ? payload.error.message
          : "Image generation failed.";
    throw new Error(message || "Image generation failed.");
  }

  if ("data" in payload && Array.isArray(payload.data) && payload.data[0]) {
    return {
      imageUrl: payload.data[0].url ?? null,
      imageBase64: payload.data[0].b64_json ?? null,
      mediaType: "image/png",
      provider: "nano-banana-pro",
      metadata: null as Json | null,
    };
  }

  const directPayload = payload as {
    imageUrl?: string;
    image_url?: string;
    url?: string;
    imageBase64?: string;
    image_base64?: string;
    mediaType?: string;
    media_type?: string;
    metadata?: Json;
  };

  return {
    imageUrl: directPayload.imageUrl ?? directPayload.image_url ?? directPayload.url ?? null,
    imageBase64: directPayload.imageBase64 ?? directPayload.image_base64 ?? null,
    mediaType: directPayload.mediaType ?? directPayload.media_type ?? "image/png",
    provider: "nano-banana-pro",
    metadata: directPayload.metadata ?? null,
  };
}
