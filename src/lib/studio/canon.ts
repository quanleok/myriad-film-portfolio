import type {
  StudioBeat,
  StudioEntity,
  StudioFocusRoom,
  StudioScene,
  StudioStoryCore,
  StudioStorySelection,
  StudioWriterStatus,
} from "@/types/studio";

export interface CanonFieldDefinition {
  fieldName: string;
  label: string;
  kind: "text" | "textarea";
  helper?: string;
}

interface StoryContext {
  storyCore: StudioStoryCore | null;
  characters: StudioEntity[];
  beats: StudioBeat[];
  scenes: StudioScene[];
}

const META_KEYS = new Set([
  "workflow_status",
  "unresolved_items",
  "current_working_version",
  "decision_rationale",
]);

function normalize(value: unknown) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function includesText(haystack: string | null | undefined, needle: string) {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

function getSceneCharacterNames(scene: StudioScene) {
  return Array.from(
    new Set(
      (scene.dialogue_blocks ?? [])
        .map((block) => block.character?.trim())
        .filter(Boolean) as string[]
    )
  );
}

export function getWorkflowStatus(room: StudioFocusRoom): StudioWriterStatus {
  const status = room.canon_snapshot?.workflow_status;
  if (
    status === "idea" ||
    status === "working_canon" ||
    status === "locked_canon" ||
    status === "unresolved"
  ) {
    return status;
  }
  return room.locked_facts.length > 0 ? "working_canon" : "idea";
}

export function getCurrentWorkingVersion(room: StudioFocusRoom) {
  const value = room.canon_snapshot?.current_working_version;
  return typeof value === "string" ? value : "";
}

export function getUnresolvedItems(room: StudioFocusRoom) {
  const value = room.canon_snapshot?.unresolved_items;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export function getRenderableCanonEntries(room: StudioFocusRoom) {
  return Object.entries(room.canon_snapshot).filter(
    ([key, value]) =>
      !META_KEYS.has(key) && value !== null && value !== undefined && value !== ""
  );
}

export function getCanonFieldDefinitions(
  selection: StudioStorySelection
): CanonFieldDefinition[] {
  switch (selection.kind) {
    case "story_core":
      return [
        { fieldName: "premise", label: "Premise", kind: "textarea" },
        { fieldName: "theme", label: "Theme", kind: "textarea" },
        { fieldName: "tone", label: "Tone", kind: "text" },
        { fieldName: "setting", label: "Setting", kind: "text" },
        {
          fieldName: "synopsis",
          label: "Working synopsis",
          kind: "textarea",
          helper: "Use this for the current clean spine, not final prose.",
        },
      ];
    case "character":
      return [
        { fieldName: "summary", label: "Role in story", kind: "textarea" },
        { fieldName: "motivation", label: "Motivation", kind: "textarea" },
        { fieldName: "arc", label: "Arc", kind: "textarea" },
        {
          fieldName: "visual_description",
          label: "Visual / tonal impression",
          kind: "textarea",
        },
      ];
    case "beat":
      return [
        { fieldName: "title", label: "Beat title", kind: "text" },
        { fieldName: "description", label: "Locked beat statement", kind: "textarea" },
        { fieldName: "act", label: "Act", kind: "text" },
        { fieldName: "beat_type", label: "Beat type", kind: "text" },
      ];
    case "scene":
      return [
        { fieldName: "title", label: "Scene title", kind: "text" },
        {
          fieldName: "beat",
          label: "Scene purpose / linked beat",
          kind: "textarea",
        },
        {
          fieldName: "script_excerpt",
          label: "Working scene excerpt",
          kind: "textarea",
          helper: "Treat this as the current canon snapshot for the scene, not polished pages.",
        },
      ];
  }
}

export function buildFieldValues(
  selection: StudioStorySelection,
  room: StudioFocusRoom
) {
  const values: Record<string, string> = {};
  for (const field of getCanonFieldDefinitions(selection)) {
    const roomValue = room.canon_snapshot?.[field.fieldName];
    const selectionValue =
      field.fieldName in selection.data
        ? (selection.data[field.fieldName as keyof typeof selection.data] as unknown)
        : "";
    values[field.fieldName] = normalize(roomValue !== undefined ? roomValue : selectionValue);
  }
  return values;
}

export function getFieldDiffs(
  selection: StudioStorySelection,
  fieldValues: Record<string, string>
) {
  return getCanonFieldDefinitions(selection)
    .map((field) => {
      const oldValue =
        field.fieldName in selection.data
          ? (selection.data[field.fieldName as keyof typeof selection.data] as unknown)
          : "";
      const newValue = fieldValues[field.fieldName] ?? "";
      return {
        field,
        oldValue,
        newValue,
        changed: normalize(oldValue) !== normalize(newValue),
      };
    })
    .filter((entry) => entry.changed);
}

export function buildImpactWarnings(
  selection: StudioStorySelection,
  context: StoryContext
) {
  switch (selection.kind) {
    case "story_core": {
      const warnings = [
        `${context.beats.length} beat${context.beats.length === 1 ? "" : "s"} inherit from the current story spine.`,
        `${context.scenes.length} scene${context.scenes.length === 1 ? "" : "s"} may need review if premise, tone, or synopsis shift.`,
      ];
      if (context.characters.length > 0) {
        warnings.push(
          `${context.characters.length} character profile${
            context.characters.length === 1 ? "" : "s"
          } may need motive or arc adjustments.`
        );
      }
      return warnings;
    }
    case "character": {
      const name = selection.data.name.trim();
      const beatRefs = context.beats.filter(
        (beat) =>
          includesText(beat.title, name) || includesText(beat.description, name)
      );
      const sceneRefs = context.scenes.filter((scene) => {
        const dialogueNames = getSceneCharacterNames(scene);
        return (
          includesText(scene.title, name) ||
          includesText(scene.beat, name) ||
          includesText(scene.script_excerpt, name) ||
          dialogueNames.some((characterName) =>
            includesText(characterName, name)
          )
        );
      });
      const warnings: string[] = [];
      if (beatRefs.length > 0) {
        warnings.push(
          `${beatRefs.length} beat${beatRefs.length === 1 ? "" : "s"} reference this character and may need logic review.`
        );
      }
      if (sceneRefs.length > 0) {
        warnings.push(
          `${sceneRefs.length} scene${sceneRefs.length === 1 ? "" : "s"} mention or contain this character directly.`
        );
      }
      if ((selection.data.relationships ?? []).length > 0) {
        warnings.push(
          `${selection.data.relationships.length} relationship link${
            selection.data.relationships.length === 1 ? "" : "s"
          } may need re-checking if this character changes.`
        );
      }
      return warnings;
    }
    case "beat": {
      const linkedScenes = context.scenes.filter(
        (scene) =>
          selection.data.linked_scene_ids.includes(scene.id) ||
          includesText(scene.beat, selection.data.title)
      );
      const characterRefs = context.characters.filter(
        (character) =>
          includesText(selection.data.description, character.name) ||
          includesText(selection.data.title, character.name)
      );
      const warnings: string[] = [];
      if (linkedScenes.length > 0) {
        warnings.push(
          `${linkedScenes.length} scene${linkedScenes.length === 1 ? "" : "s"} are tied to this beat and may drift if the turn changes.`
        );
      }
      if (characterRefs.length > 0) {
        warnings.push(
          `${characterRefs.length} character${characterRefs.length === 1 ? "" : "s"} are named in this beat description.`
        );
      }
      if (selection.data.act) {
        warnings.push(
          `This beat currently anchors ${selection.data.act.replace(/_/g, " ")} pacing.`
        );
      }
      return warnings;
    }
    case "scene": {
      const matchingBeat = context.beats.find(
        (beat) =>
          includesText(selection.data.beat, beat.title) ||
          beat.linked_scene_ids.includes(selection.data.id)
      );
      const presentCharacters = context.characters.filter((character) => {
        const dialogueNames = getSceneCharacterNames(selection.data);
        return (
          includesText(selection.data.script_excerpt, character.name) ||
          dialogueNames.some((name) => includesText(name, character.name))
        );
      });
      const warnings: string[] = [];
      if (matchingBeat) {
        warnings.push(`This scene appears linked to beat: ${matchingBeat.title}.`);
      }
      if (presentCharacters.length > 0) {
        warnings.push(
          `${presentCharacters.length} character${
            presentCharacters.length === 1 ? "" : "s"
          } appear in the current scene excerpt or dialogue blocks.`
        );
      }
      if (selection.data.script_excerpt?.trim()) {
        warnings.push(
          "Changing this scene excerpt may leave the screenplay draft out of sync until the center script is revised."
        );
      }
      return warnings;
    }
  }
}

