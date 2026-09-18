import type { StudioFocusRoom, StudioRoomMessage, StudioRoomType } from "@/types/studio";

interface GuidedTool {
  label: string;
  prompt: string;
  mode: "clarify" | "explore" | "refine" | "lock";
}

const QUESTION_BANKS: Record<StudioRoomType, string[]> = {
  character: [
    "What does this character want more than anything in the story, and why can they not say it plainly?",
    "What contradiction makes this character interesting instead of generic?",
    "What should never be true about this character, no matter how much the script changes?",
    "What visual or tonal impression should this character leave the moment they appear?",
  ],
  beat: [
    "What exact story turn must happen in this beat?",
    "Why does this beat exist instead of being folded into the scene before or after it?",
    "What emotional shift should the audience feel here?",
    "What later payoff depends on this beat landing correctly?",
  ],
  scene: [
    "Whose scene is this really, and what changes for them by the end of it?",
    "What is the central conflict of this scene, not just the surface action?",
    "What detail or reveal should the audience walk away holding after this scene?",
    "If this scene were cut, what specific damage would it do to the movie?",
  ],
  dialogue: [
    "What is the subtext underneath this exchange?",
    "Which line carries the real turn, and why?",
    "What should this dialogue reveal indirectly instead of stating openly?",
    "What is the one thing that would make this exchange sound more like these characters and less like a draft?",
  ],
};

const TOOL_SETS: Record<StudioRoomType, GuidedTool[]> = {
  character: [
    {
      label: "Clarify canon",
      mode: "clarify",
      prompt:
        "Interview me to clarify this character. Ask one targeted question at a time until the canon feels specific and stable.",
    },
    {
      label: "Explore alternates",
      mode: "explore",
      prompt:
        "Give me 3 alternate directions for this character's motive, contradiction, or social mask without breaking the rest of the story.",
    },
    {
      label: "Refine voice",
      mode: "refine",
      prompt:
        "Help me sharpen this character's voice, contradiction, and emotional presence on screen.",
    },
    {
      label: "Lock canon",
      mode: "lock",
      prompt:
        "Summarize this character into a clean canon brief with motive, contradiction, role, arc, and visual tone.",
    },
  ],
  beat: [
    {
      label: "Clarify the turn",
      mode: "clarify",
      prompt:
        "Interview me to clarify this beat. Ask one question at a time until the turn, purpose, and payoff are unambiguous.",
    },
    {
      label: "Explore options",
      mode: "explore",
      prompt:
        "Suggest alternate versions of this beat that are stronger, stranger, or more emotionally charged while keeping the core story intact.",
    },
    {
      label: "Refine structure",
      mode: "refine",
      prompt:
        "Help me tighten this beat so it earns its place in the structure and flows into the next movement.",
    },
    {
      label: "Lock canon",
      mode: "lock",
      prompt:
        "Summarize this beat into a clean canon statement with purpose, turn, emotional effect, and downstream consequences.",
    },
  ],
  scene: [
    {
      label: "Clarify the scene",
      mode: "clarify",
      prompt:
        "Interview me to clarify this scene. Ask one focused question at a time until the scene objective, conflict, and turn are clear.",
    },
    {
      label: "Explore scene options",
      mode: "explore",
      prompt:
        "Give me 3 alternate directions for this scene: one tighter, one darker, and one more emotionally exposed.",
    },
    {
      label: "Refine the scene",
      mode: "refine",
      prompt:
        "Help me make this scene stronger without changing the whole movie. Focus on conflict, clarity, and emotional force.",
    },
    {
      label: "Lock canon",
      mode: "lock",
      prompt:
        "Summarize this scene into a canon card with purpose, conflict, reveal, emotional turn, and what changes by the end.",
    },
  ],
  dialogue: [
    {
      label: "Clarify intent",
      mode: "clarify",
      prompt:
        "Interview me to clarify what this exchange is really doing beneath the surface before rewriting it.",
    },
    {
      label: "Explore alternates",
      mode: "explore",
      prompt:
        "Give me 3 alternate dialogue approaches for this exchange with different tone or subtext, while keeping the scene purpose stable.",
    },
    {
      label: "Refine voice",
      mode: "refine",
      prompt:
        "Help me refine this dialogue for character voice, tension, and subtext without making it generic.",
    },
    {
      label: "Lock canon",
      mode: "lock",
      prompt:
        "Summarize what this exchange must accomplish and what each speaker is really saying underneath the dialogue.",
    },
  ],
};

function firstNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getRoomTools(roomType: StudioRoomType): GuidedTool[] {
  return TOOL_SETS[roomType] ?? [];
}

export function buildStarterAssistantMessage(room: StudioFocusRoom) {
  const questions = QUESTION_BANKS[room.room_type] ?? [];
  const firstQuestion =
    questions[0] ??
    "What is the one thing we need to clarify in this room before any rewrite happens?";

  const contextHint =
    room.room_type === "character"
      ? firstNonEmptyString(room.canon_snapshot?.summary) || firstNonEmptyString(room.canon_snapshot?.motivation)
      : room.room_type === "scene"
        ? firstNonEmptyString(room.canon_snapshot?.beat) || firstNonEmptyString(room.canon_snapshot?.excerpt)
        : room.room_type === "beat"
          ? firstNonEmptyString(room.canon_snapshot?.description)
          : null;

  return [
    "We’ll do this one piece at a time.",
    contextHint ? `Current working version: ${contextHint}` : null,
    "",
    "First question:",
    firstQuestion,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAssistantFollowUp(
  room: StudioFocusRoom,
  messages: StudioRoomMessage[],
  lastUserMessage: string
) {
  const questions = QUESTION_BANKS[room.room_type] ?? [];
  const priorUserTurns = messages.filter((message) => message.role === "user").length;
  const nextQuestion = questions[Math.min(priorUserTurns, questions.length - 1)];

  const shortReply =
    lastUserMessage.length > 180
      ? `${lastUserMessage.slice(0, 177).trim()}...`
      : lastUserMessage.trim();

  if (!nextQuestion) {
    return [
      "Good. We have enough to lock a working version.",
      "",
      "Next move:",
      "Use a lock-canon tool or propose a change back into the project.",
    ].join("\n");
  }

  return [
    "Good.",
    "",
    "Current working version, not locked yet:",
    `- ${shortReply}`,
    "",
    "Next question:",
    nextQuestion,
  ].join("\n");
}
