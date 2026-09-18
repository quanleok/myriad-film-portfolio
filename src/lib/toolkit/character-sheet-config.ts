export const CHARACTER_OUTPUT_TYPES = [
  "fullbody",
  "sheet",
  "description",
  "expression",
  "closeup",
  "palette",
] as const;

export type CharacterOutputType = (typeof CHARACTER_OUTPUT_TYPES)[number];

export interface CharacterOutputOption {
  type: CharacterOutputType;
  label: string;
  summary: string;
  mode: "image" | "json";
}

export const CHARACTER_OUTPUT_OPTIONS: CharacterOutputOption[] = [
  {
    type: "fullbody",
    label: "Full body",
    summary: "Expand a close portrait into a standing full-body concept view.",
    mode: "image",
  },
  {
    type: "sheet",
    label: "Character sheet",
    summary: "Front, 3/4, side, and back views on a single reference sheet.",
    mode: "image",
  },
  {
    type: "description",
    label: "Description",
    summary: "Structured physical breakdown plus a prompt-ready description block.",
    mode: "json",
  },
  {
    type: "expression",
    label: "Expressions",
    summary: "Generate a reference board of the same character across key emotions.",
    mode: "image",
  },
  {
    type: "closeup",
    label: "Close-up",
    summary: "Detailed facial close-up to lock continuity and facial features.",
    mode: "image",
  },
  {
    type: "palette",
    label: "Color palette",
    summary: "Extract the dominant costume, skin, hair, and accent colors.",
    mode: "json",
  },
];

const IMAGE_TYPES = new Set<CharacterOutputType>(["fullbody", "sheet", "expression", "closeup"]);

export function isCharacterOutputType(value: unknown): value is CharacterOutputType {
  return typeof value === "string" && CHARACTER_OUTPUT_TYPES.includes(value as CharacterOutputType);
}

export function isImageOutputType(
  type: CharacterOutputType
): type is Extract<CharacterOutputType, "fullbody" | "sheet" | "expression" | "closeup"> {
  return IMAGE_TYPES.has(type);
}

export function getOutputOption(type: CharacterOutputType) {
  return CHARACTER_OUTPUT_OPTIONS.find((option) => option.type === type) ?? CHARACTER_OUTPUT_OPTIONS[0];
}

export function outputTypeLabel(type: CharacterOutputType) {
  return getOutputOption(type).label;
}
