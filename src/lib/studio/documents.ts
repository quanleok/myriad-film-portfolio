import type { StudioDocumentKind } from "@/types/studio";

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeStudioDocumentPath(input: string) {
  const normalized = input
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");

  if (!normalized) return "";
  if (normalized.includes("..")) return "";
  if (/\.[a-z0-9]+$/i.test(normalized)) return normalized;
  return `${normalized}.md`;
}

export function getStudioDocumentTitle(path: string) {
  const normalized = normalizeStudioDocumentPath(path);
  const parts = normalized.split("/");
  const filename = parts[parts.length - 1] || "untitled";
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  return titleCase(withoutExtension) || "Untitled";
}

export function getStudioDocumentKind(path: string): StudioDocumentKind {
  if (path.endsWith(".fountain")) return "fountain";
  if (path.startsWith("notes/")) return "notes";
  if (path.endsWith(".txt")) return "text";
  return "markdown";
}

export function buildStarterStudioDocuments(data: {
  title: string;
  logline?: string;
}) {
  const logline = data.logline?.trim();
  const title = data.title.trim();

  return [
    {
      path: "core/logline.md",
      title: "Logline",
      kind: "markdown" as const,
      summary: "High-level premise for the film.",
      content: `# ${title}\n\n${logline || "What is the cleanest one or two sentence version of the movie?"}\n`,
    },
    {
      path: "core/theme.md",
      title: "Theme",
      kind: "markdown" as const,
      summary: "What the story is really about underneath plot.",
      content:
        "# Theme\n\nWhat belief, wound, or contradiction is this movie interrogating?\n",
    },
    {
      path: "characters/protagonist.md",
      title: "Protagonist",
      kind: "markdown" as const,
      summary: "Lead character file.",
      content:
        "# Protagonist\n\n## Want\n\n## Fear\n\n## Contradiction\n\n## Arc\n",
    },
    {
      path: "characters/antagonist.md",
      title: "Antagonist",
      kind: "markdown" as const,
      summary: "Primary opposing force.",
      content:
        "# Antagonist\n\n## Agenda\n\n## Pressure Applied\n\n## Why They Make Sense To Themselves\n",
    },
    {
      path: "structure/beat-sheet.md",
      title: "Beat Sheet",
      kind: "markdown" as const,
      summary: "High-level structural turns.",
      content:
        "# Beat Sheet\n\n- Opening image\n- Inciting incident\n- First major turn\n- Midpoint\n- Second major turn\n- Climax\n- Resolution\n",
    },
    {
      path: "structure/act-1.md",
      title: "Act 1",
      kind: "markdown" as const,
      summary: "Act-by-act breakdown.",
      content:
        "# Act 1\n\nWhat changes the movie from setup into motion?\n",
    },
    {
      path: "structure/act-2.md",
      title: "Act 2",
      kind: "markdown" as const,
      summary: "Middle movement and pressure.",
      content:
        "# Act 2\n\nWhere does pressure compound, and how does the movie keep changing shape?\n",
    },
    {
      path: "structure/act-3.md",
      title: "Act 3",
      kind: "markdown" as const,
      summary: "Ending movement and resolution.",
      content:
        "# Act 3\n\nWhat final decision or collision resolves the core conflict?\n",
    },
    {
      path: "dialogue/key-exchanges.md",
      title: "Key Exchanges",
      kind: "markdown" as const,
      summary: "Important dialogue moments worth pressure-testing.",
      content:
        "# Key Exchanges\n\nList the scenes or conversations where voice and subtext matter most.\n",
    },
    {
      path: "notes/brainstorm.md",
      title: "Brainstorm",
      kind: "notes" as const,
      summary: "Loose ideas, fragments, images, and open questions.",
      content:
        "# Brainstorm\n\nDrop loose images, scene ideas, fragments of dialogue, or contradictions here.\n",
    },
  ];
}
