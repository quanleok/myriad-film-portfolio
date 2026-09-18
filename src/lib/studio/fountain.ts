import type { StudioEntityType } from "@/types/studio";

export interface FountainDerivedScene {
  id: string;
  title: string;
  excerpt: string;
  characterNames: string[];
  sortOrder: number;
}

export interface FountainDerivedEntity {
  id: string;
  name: string;
  entityType: StudioEntityType;
  summary: string;
  tags: string[];
  dialogueCount: number;
}

export interface FountainScriptStats {
  wordCount: number;
  sceneCount: number;
  dialogueCount: number;
  characterCount: number;
}

const SCENE_HEADING_RE = /^(INT|EXT|EST|INT\/EXT|I\/E|INT\.\/EXT)\b/i;
const TRANSITION_RE = /^(FADE OUT\.|FADE IN\.|CUT TO:|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|BLACKOUT\.)$/i;
const CHARACTER_RE = /^[A-Z0-9][A-Z0-9 '().-]{1,36}$/;

function isSceneHeading(line: string) {
  return SCENE_HEADING_RE.test(line.trim());
}

function isTransition(line: string) {
  return TRANSITION_RE.test(line.trim());
}

function isCharacterCue(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 36) return false;
  if (isSceneHeading(trimmed) || isTransition(trimmed)) return false;
  if (!CHARACTER_RE.test(trimmed)) return false;
  return !/[a-z]/.test(trimmed);
}

export function extractFountainScenes(content: string): FountainDerivedScene[] {
  const lines = content.split("\n");
  const scenes: FountainDerivedScene[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!isSceneHeading(line)) continue;

    const excerptLines: string[] = [];
    const characters = new Set<string>();

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor]?.trim() ?? "";
      if (isSceneHeading(nextLine)) break;
      if (!nextLine) continue;

      if (isCharacterCue(nextLine)) {
        characters.add(nextLine);
      }

      if (excerptLines.length < 3) {
        excerptLines.push(nextLine);
      }
    }

    scenes.push({
      id: `derived-scene-${scenes.length + 1}`,
      title: line,
      excerpt: excerptLines.join(" "),
      characterNames: Array.from(characters),
      sortOrder: scenes.length,
    });
  }

  return scenes;
}

export function extractFountainCharacters(content: string): FountainDerivedEntity[] {
  const counts = new Map<string, number>();

  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (isCharacterCue(trimmed)) {
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, dialogueCount], index) => ({
      id: `derived-character-${index + 1}`,
      name,
      entityType: "character" as const,
      summary: dialogueCount > 1 ? "Derived from the current screenplay draft." : "Single speaking appearance in the draft.",
      tags: dialogueCount > 3 ? ["speaking role", "core cast"] : ["speaking role"],
      dialogueCount,
    }));
}

export function getFountainScriptStats(content: string): FountainScriptStats {
  const trimmed = content.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const scenes = extractFountainScenes(content);
  const characters = extractFountainCharacters(content);
  const dialogueCount = characters.reduce((sum, character) => sum + character.dialogueCount, 0);

  return {
    wordCount,
    sceneCount: scenes.length,
    dialogueCount,
    characterCount: characters.length,
  };
}
