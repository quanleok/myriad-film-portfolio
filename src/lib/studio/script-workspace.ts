import type {
  StudioBeat,
  StudioEntity,
  StudioProject,
  StudioScene,
  StudioScriptDocument,
  StudioStoryCore,
} from "@/types/studio";

export type WritePhase = "seed" | "structure" | "scenes" | "pages";
export type PhaseStatus =
  | "locked"
  | "in_progress"
  | "approved"
  | "needs_review";

export interface PhaseState {
  key: WritePhase;
  label: string;
  description: string;
  status: PhaseStatus;
}

export interface ScriptProjectSummary {
  id: string;
  title: string;
  logline: string;
  format: "short" | "feature" | "series";
  genre: string;
  tone: string;
  runtimeLabel: string;
  stageLabel: string;
}

export interface SeedBox {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  hint: string;
  status: "draft" | "ready" | "unresolved";
}

export interface CharacterBox {
  id: string;
  name: string;
  role: string;
  want: string;
  conflict: string;
  status: "draft" | "ready" | "unresolved";
}

export interface WorldBox {
  id: string;
  label: string;
  value: string;
  hint: string;
  status: "draft" | "ready" | "unresolved";
}

export interface UnresolvedSlot {
  id: string;
  label: string;
  note: string;
}

export interface SeedBoard {
  kickoffIdea: string;
  summary: string;
  boxes: SeedBox[];
  characters: CharacterBox[];
  world: WorldBox[];
  unresolved: UnresolvedSlot[];
}

export interface StoryLineDot {
  id: string;
  title: string;
  event: string;
  change: string;
  status: "draft" | "ready";
}

export interface StructureNode {
  id: string;
  title: string;
  event: string;
  change: string;
  purpose: string;
}

export interface StructureOption {
  id: string;
  title: string;
  summary: string;
  recommendationReason: string;
  nodes: StructureNode[];
  recommended: boolean;
}

export interface StructureBoard {
  railSummary: string;
  storyLine: StoryLineDot[];
  options: StructureOption[];
  selectedOptionId: string;
}

export interface SceneCard {
  id: string;
  title: string;
  purpose: string;
  conflict: string;
  turn: string;
  characters: string[];
  locations: string[];
  props: string[];
  draftText: string;
  status: "draft" | "ready" | "approved";
}

export interface ScenesBoard {
  summary: string;
  cards: SceneCard[];
}

export interface PagesBoard {
  selectedSceneId: string;
  screenplay: string;
  syncSuggestion: string;
}

export interface ScriptWorkspacePayload {
  project: ScriptProjectSummary;
  phases: Record<WritePhase, PhaseState>;
  seed: SeedBoard;
  structure: StructureBoard;
  scenes: ScenesBoard;
  pages: PagesBoard;
}

export interface StudioScriptWorkspaceSnapshot {
  project: StudioProject;
  storyCore: StudioStoryCore | null;
  entities: StudioEntity[];
  beats: StudioBeat[];
  scenes: StudioScene[];
  script: StudioScriptDocument | null;
}

export const phaseOrder: WritePhase[] = [
  "seed",
  "structure",
  "scenes",
  "pages",
];

export const phaseMeta: Record<
  WritePhase,
  Pick<PhaseState, "label" | "description">
> = {
  seed: {
    label: "Story",
    description:
      "Lock the story spine: premise, lead, goal, pressure, tone, and ending direction.",
  },
  structure: {
    label: "Structure",
    description:
      "Shape the plot line, act turns, and beat sheet before writing scenes.",
  },
  scenes: {
    label: "Scenes",
    description:
      "Turn the structure into scene cards with purpose, conflict, and turn.",
  },
  pages: {
    label: "Script",
    description:
      "Write one scene at a time with the screenplay editor and scene logic in sync.",
  },
};

function createInitialPhases(): Record<WritePhase, PhaseState> {
  return {
    seed: { key: "seed", ...phaseMeta.seed, status: "in_progress" },
    structure: { key: "structure", ...phaseMeta.structure, status: "locked" },
    scenes: { key: "scenes", ...phaseMeta.scenes, status: "locked" },
    pages: { key: "pages", ...phaseMeta.pages, status: "locked" },
  };
}

function titleFromProjectId(projectId: string) {
  return projectId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

export function createBlankWorkspace(
  projectId: string,
): ScriptWorkspacePayload {
  return {
    project: {
      id: projectId,
      title: titleFromProjectId(projectId),
      logline: "Untitled script project waiting for a premise worth building.",
      format: "feature",
      genre: "",
      tone: "Undefined",
      runtimeLabel: "Feature · undecided",
      stageLabel: "Story in progress",
    },
    phases: createInitialPhases(),
    seed: {
      kickoffIdea: "",
      summary:
        "Start with one to three sentences. The app should interrogate the idea until the premise becomes solid enough to structure.",
      boxes: [
        {
          id: "premise",
          label: "Premise",
          value: "",
          placeholder: "What is the movie, in plain language?",
          hint: "The cleanest possible statement of the movie.",
          status: "draft",
        },
        {
          id: "protagonist",
          label: "Protagonist",
          value: "",
          placeholder: "Who carries the film?",
          hint: "Not the whole cast. Just the lead focus.",
          status: "draft",
        },
        {
          id: "goal",
          label: "Goal",
          value: "",
          placeholder: "What are they trying to achieve?",
          hint: "If the lead wants nothing, structure gets slippery fast.",
          status: "draft",
        },
        {
          id: "conflict",
          label: "Villain / Pressure",
          value: "",
          placeholder: "What pushes back?",
          hint: "This can be a person, situation, system, mystery, or internal pressure.",
          status: "draft",
        },
        {
          id: "tone",
          label: "Tone",
          value: "",
          placeholder: "How should this feel on screen?",
          hint: "Grounded, mythic, intimate, brutal, playful, haunted...",
          status: "draft",
        },
        {
          id: "ending",
          label: "Ending Direction",
          value: "",
          placeholder: "Where do you think it roughly lands?",
          hint: "Not the full ending. Just the direction of the finish.",
          status: "draft",
        },
        {
          id: "runtime",
          label: "Runtime / Scale",
          value: "",
          placeholder: "Short? Feature? How big does it feel?",
          hint: "The app uses this to choose how much structure to generate.",
          status: "draft",
        },
      ],
      characters: [
        {
          id: "character-lead",
          name: "Lead",
          role: "",
          want: "",
          conflict: "",
          status: "draft",
        },
        {
          id: "character-antagonist",
          name: "Antagonist",
          role: "",
          want: "",
          conflict: "",
          status: "draft",
        },
      ],
      world: [
        {
          id: "world-setting",
          label: "Setting",
          value: "",
          hint: "Where does this story live?",
          status: "draft",
        },
        {
          id: "world-rules",
          label: "Rules",
          value: "",
          hint: "What world rules matter to the story right now?",
          status: "draft",
        },
        {
          id: "world-hook",
          label: "Special Hook",
          value: "",
          hint: "What makes this movie’s world or setup distinct?",
          status: "draft",
        },
      ],
      unresolved: [
        {
          id: "unresolved-opposition",
          label: "Main opposing pressure",
          note: "If the story doesn’t have a villain yet, track the pressure here and revisit it in structure.",
        },
      ],
    },
    structure: {
      railSummary: "No plot line rail yet. Approve the Story board first.",
      storyLine: [],
      options: [],
      selectedOptionId: "",
    },
    scenes: {
      summary: "Scene cards appear after the structure board is approved.",
      cards: [],
    },
    pages: {
      selectedSceneId: "",
      screenplay: "",
      syncSuggestion:
        "Once scene cards are stable, the script should be written and rewritten one scene at a time.",
    },
  };
}

function runtimeLabelForFormat(format: StudioProject["format"]) {
  switch (format) {
    case "short":
      return "Short film · compact structure";
    case "series":
      return "Series project · treated like a film draft for now";
    case "feature":
    default:
      return "Feature film · full structure";
  }
}

function seedSummaryFromSnapshot(snapshot: StudioScriptWorkspaceSnapshot) {
  if (snapshot.storyCore?.premise?.trim()) {
    return "Current Studio data has enough premise context to start shaping the story spine into controlled boxes.";
  }
  if (snapshot.project.logline.trim()) {
    return "This project already has a rough movie idea. Tighten the story spine before pushing structure further.";
  }
  return "Start with one to three sentences. The app should interrogate the idea until the premise becomes solid enough to structure.";
}

function mapCharacterBoxes(
  snapshot: StudioScriptWorkspaceSnapshot,
): CharacterBox[] {
  const characters = snapshot.entities.filter(
    (entity) => entity.entity_type === "character",
  );
  if (characters.length === 0) {
    return [
      {
        id: "character-lead",
        name: "Lead",
        role: "",
        want: "",
        conflict: "",
        status: "draft",
      },
      {
        id: "character-antagonist",
        name: "Antagonist",
        role: "",
        want: "",
        conflict: "",
        status: "draft",
      },
    ];
  }

  return characters.map((entity) => ({
    id: entity.id,
    name: entity.name,
    role: entity.summary || entity.backstory || "",
    want: entity.motivation || "",
    conflict: entity.arc || "",
    status:
      entity.name.trim() && (entity.summary || entity.motivation || entity.arc)
        ? "ready"
        : "draft",
  }));
}

function mapWorldBoxes(snapshot: StudioScriptWorkspaceSnapshot): WorldBox[] {
  return [
    {
      id: "world-setting",
      label: "Setting",
      value: snapshot.storyCore?.setting ?? "",
      hint: "Where does this story live?",
      status: snapshot.storyCore?.setting?.trim() ? "ready" : "draft",
    },
    {
      id: "world-rules",
      label: "Rules",
      value: snapshot.storyCore?.world_rules?.filter(Boolean).join("\n") ?? "",
      hint: "What world rules matter to the story right now?",
      status: snapshot.storyCore?.world_rules?.length ? "ready" : "draft",
    },
    {
      id: "world-hook",
      label: "Special Hook",
      value:
        snapshot.storyCore?.synopsis ||
        snapshot.project.logline ||
        snapshot.storyCore?.theme ||
        "",
      hint: "What makes this movie’s world or setup distinct?",
      status:
        snapshot.storyCore?.synopsis?.trim() || snapshot.project.logline.trim()
          ? "ready"
          : "draft",
    },
  ];
}

function buildUnresolvedSlots(
  snapshot: StudioScriptWorkspaceSnapshot,
): UnresolvedSlot[] {
  const unresolved: UnresolvedSlot[] = [];

  if (!snapshot.storyCore?.theme?.trim()) {
    unresolved.push({
      id: "unresolved-theme",
      label: "Theme / emotional promise",
      note: "The project still needs a sharper statement of what the film is really about underneath the plot.",
    });
  }

  if (
    !snapshot.storyCore?.premise?.trim() &&
    !snapshot.project.logline.trim()
  ) {
    unresolved.push({
      id: "unresolved-premise",
      label: "Core premise",
      note: "There is no stable premise yet. Clarify this before trusting any structure.",
    });
  }

  if (!snapshot.entities.some((entity) => entity.entity_type === "character")) {
    unresolved.push({
      id: "unresolved-lead",
      label: "Lead character",
      note: "The lead is still undefined. Lock a character box before pushing scenes too far.",
    });
  }

  if (unresolved.length === 0) {
    unresolved.push({
      id: "unresolved-ending",
      label: "Ending direction",
      note: "Track the ending emotion here until the structure makes it stable enough to lock.",
    });
  }

  return unresolved;
}

function buildCurrentBeatOption(beats: StudioBeat[]): StructureOption {
  return {
    id: "option-current-map",
    title: "Current structure",
    summary:
      "Uses the beats already stored in Studio as the working structural spine.",
    recommendationReason:
      "Best base when the project already has real beats that should not be discarded.",
    recommended: true,
    nodes: beats.map((beat, index) => ({
      id: beat.id,
      title: beat.title || `Beat ${index + 1}`,
      event: beat.description || beat.title || `Beat ${index + 1}`,
      change:
        beat.linked_scene_ids.length > 0
          ? `Touches ${beat.linked_scene_ids.length} linked scene${beat.linked_scene_ids.length === 1 ? "" : "s"}.`
          : "This beat pushes the story into the next movement.",
      purpose:
        beat.description ||
        "Clarify what this beat accomplishes before trusting downstream scenes.",
    })),
  };
}

function derivePhaseStateFromSnapshot(
  snapshot: StudioScriptWorkspaceSnapshot,
): Record<WritePhase, PhaseState> {
  const phases = createInitialPhases();
  const hasPremise =
    Boolean(snapshot.storyCore?.premise?.trim()) ||
    Boolean(snapshot.project.logline.trim());
  const hasBeats = snapshot.beats.length > 0;
  const hasScenes = snapshot.scenes.length > 0;
  const hasPages = Boolean(snapshot.script?.content?.trim());

  if (hasPremise || hasBeats || hasScenes || hasPages) {
    phases.seed.status =
      hasBeats || hasScenes || hasPages ? "approved" : "in_progress";
  }

  if (hasBeats || hasScenes || hasPages) {
    phases.structure.status =
      hasScenes || hasPages ? "approved" : "in_progress";
  }

  if (hasScenes || hasPages) {
    phases.scenes.status = hasPages ? "approved" : "in_progress";
    phases.pages.status = "in_progress";
  }

  return phases;
}

function deriveStageLabel(phases: Record<WritePhase, PhaseState>) {
  if (phases.pages.status !== "locked") return "Script active";
  if (phases.scenes.status !== "locked") return "Scenes in progress";
  if (phases.structure.status !== "locked") return "Structure in progress";
  return "Story in progress";
}

export function createWorkspaceFromStudioSnapshot(
  snapshot: StudioScriptWorkspaceSnapshot,
): ScriptWorkspacePayload {
  const workspace = createBlankWorkspace(snapshot.project.id);

  workspace.project = {
    id: snapshot.project.id,
    title: snapshot.project.title || titleFromProjectId(snapshot.project.id),
    logline:
      snapshot.project.logline.trim() ||
      snapshot.storyCore?.premise ||
      "Untitled script project waiting for a premise worth building.",
    format: snapshot.project.format,
    genre: snapshot.project.genre.trim() || "Unclassified",
    tone: snapshot.storyCore?.tone?.trim() || "Still finding tone",
    runtimeLabel: runtimeLabelForFormat(snapshot.project.format),
    stageLabel: workspace.project.stageLabel,
  };

  workspace.seed.kickoffIdea =
    snapshot.project.logline.trim() || snapshot.storyCore?.premise || "";
  workspace.seed.summary = seedSummaryFromSnapshot(snapshot);
  workspace.seed.boxes = [
    {
      id: "premise",
      label: "Premise",
      value: snapshot.storyCore?.premise || snapshot.project.logline || "",
      placeholder: "What is the movie, in plain language?",
      hint: "The cleanest possible statement of the movie.",
      status:
        snapshot.storyCore?.premise?.trim() || snapshot.project.logline.trim()
          ? "ready"
          : "draft",
    },
    {
      id: "protagonist",
      label: "Protagonist",
      value:
        mapCharacterBoxes(snapshot)[0]?.name &&
        mapCharacterBoxes(snapshot)[0]?.role
          ? `${mapCharacterBoxes(snapshot)[0]?.name}: ${mapCharacterBoxes(snapshot)[0]?.role}`
          : mapCharacterBoxes(snapshot)[0]?.name || "",
      placeholder: "Who carries the film?",
      hint: "Not the whole cast. Just the lead focus.",
      status: mapCharacterBoxes(snapshot)[0]?.name ? "ready" : "draft",
    },
    {
      id: "goal",
      label: "Goal",
      value: mapCharacterBoxes(snapshot)[0]?.want || "",
      placeholder: "What are they trying to achieve?",
      hint: "If the lead wants nothing, structure gets slippery fast.",
      status: mapCharacterBoxes(snapshot)[0]?.want?.trim() ? "ready" : "draft",
    },
    {
      id: "conflict",
      label: "Villain / Pressure",
      value: mapCharacterBoxes(snapshot)[0]?.conflict || "",
      placeholder: "What pushes back?",
      hint: "This can be a person, situation, system, mystery, or internal pressure.",
      status: mapCharacterBoxes(snapshot)[0]?.conflict?.trim()
        ? "ready"
        : "draft",
    },
    {
      id: "tone",
      label: "Tone",
      value: snapshot.storyCore?.tone || "",
      placeholder: "How should this feel on screen?",
      hint: "Grounded, mythic, intimate, brutal, playful, haunted...",
      status: snapshot.storyCore?.tone?.trim() ? "ready" : "draft",
    },
    {
      id: "ending",
      label: "Ending Direction",
      value: "",
      placeholder: "Where do you think it roughly lands?",
      hint: "Not the full ending. Just the direction of the finish.",
      status: "draft",
    },
    {
      id: "runtime",
      label: "Runtime / Scale",
      value: runtimeLabelForFormat(snapshot.project.format),
      placeholder: "Short? Feature? How big does it feel?",
      hint: "The app uses this to choose how much structure to generate.",
      status: "ready",
    },
  ];
  workspace.seed.characters = mapCharacterBoxes(snapshot);
  workspace.seed.world = mapWorldBoxes(snapshot);
  workspace.seed.unresolved = buildUnresolvedSlots(snapshot);

  generateStructureFromSeed(workspace);
  if (snapshot.beats.length > 0) {
    workspace.structure.railSummary =
      "This rail is bootstrapped from the beats already living in Studio. Refine the causal flow before trusting downstream scenes.";
    workspace.structure.storyLine = snapshot.beats.map((beat, index) => ({
      id: beat.id,
      title: beat.title || `Beat ${index + 1}`,
      event: beat.description || beat.title || `Beat ${index + 1}`,
      change:
        beat.linked_scene_ids.length > 0
          ? `Feeds ${beat.linked_scene_ids.length} linked scene${beat.linked_scene_ids.length === 1 ? "" : "s"}.`
          : "This beat should create a meaningful shift.",
      status:
        beat.description?.trim() || beat.title?.trim() ? "ready" : "draft",
    }));
    const generatedOptions = workspace.structure.options.slice(1, 3);
    workspace.structure.options = [
      buildCurrentBeatOption(snapshot.beats),
      ...generatedOptions,
    ];
    workspace.structure.options[0].recommended = true;
    workspace.structure.selectedOptionId = workspace.structure.options[0].id;
  }

  if (snapshot.scenes.length > 0) {
    workspace.scenes.summary =
      "These scene cards are pulled from the current Studio project. Tighten purpose, conflict, and turn before trusting the script.";
    workspace.scenes.cards = snapshot.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      purpose: scene.beat || "Clarify why this scene exists in the film.",
      conflict:
        scene.script_excerpt ||
        "Conflict has not been clarified yet. Use the scene room to define it.",
      turn:
        scene.dialogue_blocks?.[0]?.lines ||
        "Lock what changes by the end of this scene.",
      characters:
        scene.dialogue_blocks
          ?.map((block) => block.character)
          .filter(Boolean) ?? [],
      locations: [],
      props: [],
      draftText: scene.script_excerpt || "",
      status:
        scene.status === "approved"
          ? "approved"
          : scene.status === "in_review"
            ? "ready"
            : "draft",
    }));
  } else if (snapshot.beats.length > 0) {
    generateScenesFromStructure(workspace);
  }

  if (snapshot.script?.content?.trim()) {
    workspace.pages = {
      selectedSceneId: workspace.scenes.cards[0]?.id ?? "",
      screenplay: snapshot.script.content,
      syncSuggestion:
        "If the current script draft changes what a scene is doing, sync it back intentionally instead of silently overwriting the board.",
    };
  } else if (workspace.scenes.cards.length > 0) {
    generatePagesFromScenes(workspace);
  }

  workspace.phases = derivePhaseStateFromSnapshot(snapshot);
  workspace.project.stageLabel = deriveStageLabel(workspace.phases);

  return workspace;
}

function getSeedBoxValue(workspace: ScriptWorkspacePayload, boxId: string) {
  return (
    workspace.seed.boxes.find((box) => box.id === boxId)?.value.trim() ?? ""
  );
}

function firstCharacterName(workspace: ScriptWorkspacePayload) {
  return (
    workspace.seed.characters
      .find((character) => character.name.trim())
      ?.name.trim() || "The lead"
  );
}

function compact(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function generateStructureFromSeed(workspace: ScriptWorkspacePayload) {
  const premise = compact(
    getSeedBoxValue(workspace, "premise"),
    "An unfinished movie idea needs clearer structure.",
  );
  const protagonist = compact(
    getSeedBoxValue(workspace, "protagonist"),
    firstCharacterName(workspace),
  );
  const goal = compact(
    getSeedBoxValue(workspace, "goal"),
    "figure out what the story is really pushing toward",
  );
  const conflict = compact(
    getSeedBoxValue(workspace, "conflict"),
    "something unseen keeps pressuring the lead from every direction",
  );
  const ending = compact(
    getSeedBoxValue(workspace, "ending"),
    "the ending should resolve through a decisive emotional shift",
  );

  workspace.structure.railSummary =
    "The rough rail should move from setup, to commitment, to pressure, to rupture, to landing.";
  workspace.structure.storyLine = [
    {
      id: "rail-1",
      title: "Hook",
      event: `${protagonist} is dropped into the story problem: ${premise}`,
      change: "The movie becomes active instead of hypothetical.",
      status: "ready",
    },
    {
      id: "rail-2",
      title: "Commitment",
      event: `${protagonist} chooses to pursue ${goal}.`,
      change: "The lead goes from passive uncertainty to active pursuit.",
      status: "ready",
    },
    {
      id: "rail-3",
      title: "Pressure",
      event: conflict,
      change: "The route gets harder and the first plan stops being enough.",
      status: "ready",
    },
    {
      id: "rail-4",
      title: "Rupture",
      event: `${protagonist} faces the cost of continuing and nearly loses the path.`,
      change:
        "The story turns from momentum into real moral or emotional stakes.",
      status: "ready",
    },
    {
      id: "rail-5",
      title: "Landing",
      event: ending,
      change: "The lead leaves altered, not just informed.",
      status: "ready",
    },
  ];

  workspace.structure.options = [
    {
      id: "option-clean",
      title: "Clean cinematic spine",
      summary:
        "Best when the movie needs simple, strong emotional cause and effect.",
      recommendationReason:
        "Safest way to turn the story spine into a readable solo-writing structure.",
      recommended: true,
      nodes: [
        {
          id: "clean-1",
          title: "Setup and wound",
          event: `${protagonist} is living with the cost of the story before the inciting move arrives.`,
          change:
            "The audience understands what hurts before the plot accelerates.",
          purpose: "Anchor the movie in a human reason to care.",
        },
        {
          id: "clean-2",
          title: "Point of commitment",
          event: `${protagonist} commits to ${goal}.`,
          change: "The film chooses a direction and a clock starts ticking.",
          purpose: "Convert the story into forward movement.",
        },
        {
          id: "clean-3",
          title: "Escalation",
          event: conflict,
          change: "The original plan stops being enough.",
          purpose: "Force the lead to evolve instead of merely travel.",
        },
        {
          id: "clean-4",
          title: "Break or confession",
          event: `${protagonist} gets the truth or fracture they cannot ignore.`,
          change: "The emotional meaning of the story shifts.",
          purpose: "Create the turn that makes the ending matter.",
        },
        {
          id: "clean-5",
          title: "Final choice",
          event: ending,
          change: "The lead acts from a changed understanding.",
          purpose: "Land the film through a choice, not a summary.",
        },
      ],
    },
    {
      id: "option-pressure",
      title: "Character pressure route",
      summary:
        "More confrontational and interior, with heavier emphasis on the lead’s resistance.",
      recommendationReason:
        "Useful if the emotional argument matters more than puzzle mechanics.",
      recommended: false,
      nodes: [
        {
          id: "pressure-1",
          title: "Refusal",
          event: `${protagonist} resists the story problem at first.`,
          change: "The movie opens on denial or avoidance.",
          purpose: "Sharpen the emotional distance the story must cross.",
        },
        {
          id: "pressure-2",
          title: "Forced entry",
          event: `A sharper form of ${conflict} forces movement.`,
          change: "The lead can no longer stay static.",
          purpose: "Create harder pressure and less drift.",
        },
        {
          id: "pressure-3",
          title: "False control",
          event: `${protagonist} thinks the problem is manageable, but the deeper wound opens.`,
          change: "Control gives way to vulnerability.",
          purpose: "Expose the emotional core, not just the plot lane.",
        },
        {
          id: "pressure-4",
          title: "Collapse",
          event: `${protagonist} nearly abandons ${goal}.`,
          change: "The story forces a self-defining decision.",
          purpose: "Earn the ending by threatening the whole route.",
        },
      ],
    },
    {
      id: "option-atmosphere",
      title: "Atmosphere-first drift",
      summary:
        "Leans on mood, image, and symbolic progression over tighter causal turns.",
      recommendationReason:
        "Can be beautiful, but usually needs later discipline.",
      recommended: false,
      nodes: [
        {
          id: "atmosphere-1",
          title: "Image hook",
          event: premise,
          change: "The movie opens as a feeling before it becomes a machine.",
          purpose: "Prioritize tone and image language.",
        },
        {
          id: "atmosphere-2",
          title: "Pattern of encounters",
          event: `${protagonist} moves through places or encounters that echo the story's special hook.`,
          change: "Meaning accumulates through repetition.",
          purpose: "Let the audience live in the atmosphere of the premise.",
        },
        {
          id: "atmosphere-3",
          title: "Quiet revelation",
          event: ending,
          change:
            "The story lands on internal recognition more than plot climax.",
          purpose: "Finish through resonance and mood.",
        },
      ],
    },
  ];
  workspace.structure.selectedOptionId = "option-clean";
}

export function generateScenesFromStructure(workspace: ScriptWorkspacePayload) {
  const selectedOption =
    workspace.structure.options.find(
      (option) => option.id === workspace.structure.selectedOptionId,
    ) ?? workspace.structure.options[0];
  const lead = firstCharacterName(workspace);

  workspace.scenes.summary =
    "Scene cards are story-first. Clarify their logic before the script, then write one scene at a time.";
  workspace.scenes.cards = (selectedOption?.nodes ?? []).map((node, index) => ({
    id: `scene-${index + 1}`,
    title: node.title,
    purpose: node.purpose,
    conflict:
      index === 0
        ? `${lead} is resisting the truth of the movie even as the story starts.`
        : `${lead} wants the scene to go one way, but the pressure forces something harder.`,
    turn: node.change,
    characters: [lead],
    locations: index === 0 ? ["Opening location"] : [`Location ${index + 1}`],
    props: index === 0 ? ["Lead prop / clue"] : [],
    draftText: `${node.title.toUpperCase()}\n${node.event}`,
    status: index === 0 ? "ready" : "draft",
  }));
}

export function generatePagesFromScenes(workspace: ScriptWorkspacePayload) {
  const selectedScene = workspace.scenes.cards[0];
  const screenplay = workspace.scenes.cards
    .map(
      (
        scene,
      ) => `INT. ${scene.locations[0]?.toUpperCase() ?? "LOCATION"} - ${scene.status === "ready" ? "DAY" : "NIGHT"}

${scene.title.toUpperCase()}

${scene.draftText}
`,
    )
    .join("\n");

  workspace.pages = {
    selectedSceneId: selectedScene?.id ?? "",
    screenplay,
    syncSuggestion:
      "If the script draft changes what the scene is doing, the scene card should be reviewed and synced intentionally.",
  };
}

export function phaseStatusTone(status: PhaseStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-500/12 text-emerald-200 border-emerald-400/20";
    case "needs_review":
      return "bg-amber-500/12 text-amber-100 border-amber-400/20";
    case "in_progress":
      return "bg-cyan-500/12 text-cyan-100 border-cyan-400/20";
    case "locked":
    default:
      return "bg-white/[0.04] text-slate-400 border-white/10";
  }
}

export function isWritePhase(value: string): value is WritePhase {
  return phaseOrder.includes(value as WritePhase);
}

export function mergePersistedWorkspace(
  persisted: ScriptWorkspacePayload,
  snapshotWorkspace: ScriptWorkspacePayload,
) {
  const merged = JSON.parse(
    JSON.stringify(persisted),
  ) as ScriptWorkspacePayload;
  merged.project = snapshotWorkspace.project;

  if (
    !merged.seed.kickoffIdea.trim() &&
    snapshotWorkspace.seed.kickoffIdea.trim()
  ) {
    merged.seed.kickoffIdea = snapshotWorkspace.seed.kickoffIdea;
  }

  if (
    merged.structure.storyLine.length === 0 &&
    snapshotWorkspace.structure.storyLine.length > 0
  ) {
    merged.structure = snapshotWorkspace.structure;
  }

  if (
    merged.scenes.cards.length === 0 &&
    snapshotWorkspace.scenes.cards.length > 0
  ) {
    merged.scenes = snapshotWorkspace.scenes;
  }

  if (
    !merged.pages.screenplay.trim() &&
    snapshotWorkspace.pages.screenplay.trim()
  ) {
    merged.pages = snapshotWorkspace.pages;
  }

  return merged;
}
