export type ToolkitCategory = "prompting" | "planning" | "utility" | "creative";
export type ToolkitQuickFilter = "popular" | "new" | "ai-powered";

export interface ToolApp {
  slug: string;
  name: string;
  description: string;
  detail: string;
  category: ToolkitCategory;
  usageCount: number;
  isAIPowered: boolean;
  isNew: boolean;
  isPopular: boolean;
  component: "video-stamp" | "prompt-master" | "character-sheet";
}

export const TOOLKIT_CATEGORY_LABELS: Record<ToolkitCategory, string> = {
  prompting: "Prompting",
  planning: "Planning",
  utility: "Utility",
  creative: "Creative",
};

export const TOOLKIT_PROMOTED_TAGS = [
  "Storyboards",
  "Watermarks",
  "Scene prompts",
  "Character docs",
] as const;

export const TOOLKIT_APPS: ToolApp[] = [
  {
    slug: "video-stamp",
    name: "Video Stamp",
    description: "Stamp videos with a logo, text watermark, and export right in the browser.",
    detail: "Client-side video watermarking with draggable placement, opacity control, and export.",
    category: "utility",
    usageCount: 1842,
    isAIPowered: false,
    isNew: true,
    isPopular: true,
    component: "video-stamp",
  },
  {
    slug: "prompt-master",
    name: "Prompt Master",
    description: "Turn long scripts into model-ready scene prompts with one structured pass.",
    detail: "Paste a script, choose the model, and break it into scene-by-scene prompts you can edit and copy.",
    category: "prompting",
    usageCount: 2714,
    isAIPowered: true,
    isNew: true,
    isPopular: true,
    component: "prompt-master",
  },
  {
    slug: "character-sheet",
    name: "Character Sheet",
    description: "Upload one image, generate sheets and analysis outputs, and save everything into character folders.",
    detail: "Persistent character workspace for reference uploads, AI-generated sheets, palette extraction, and prompt-ready continuity docs.",
    category: "creative",
    usageCount: 1298,
    isAIPowered: true,
    isNew: false,
    isPopular: true,
    component: "character-sheet",
  },
];

export function parseToolkitCategory(value?: string | null): ToolkitCategory | "all" {
  if (value === "prompting" || value === "planning" || value === "utility" || value === "creative") {
    return value;
  }
  return "all";
}

export function parseToolkitQuickFilter(value?: string | null): ToolkitQuickFilter | null {
  if (value === "popular" || value === "new" || value === "ai-powered") {
    return value;
  }
  return null;
}

export function getToolkitToolBySlug(slug: string) {
  return TOOLKIT_APPS.find((tool) => tool.slug === slug) ?? null;
}

export function getToolkitCategoriesWithCounts(tools: ToolApp[] = TOOLKIT_APPS) {
  const counts: Record<ToolkitCategory, number> = {
    prompting: 0,
    planning: 0,
    utility: 0,
    creative: 0,
  };

  tools.forEach((tool) => {
    counts[tool.category] += 1;
  });

  return [
    { key: "all" as const, label: "All tools", count: tools.length },
    { key: "prompting" as const, label: TOOLKIT_CATEGORY_LABELS.prompting, count: counts.prompting },
    { key: "planning" as const, label: TOOLKIT_CATEGORY_LABELS.planning, count: counts.planning },
    { key: "utility" as const, label: TOOLKIT_CATEGORY_LABELS.utility, count: counts.utility },
    { key: "creative" as const, label: TOOLKIT_CATEGORY_LABELS.creative, count: counts.creative },
  ];
}

export function filterToolkitApps({
  tools = TOOLKIT_APPS,
  query,
  category,
  quickFilter,
}: {
  tools?: ToolApp[];
  query: string;
  category: ToolkitCategory | "all";
  quickFilter: ToolkitQuickFilter | null;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return tools.filter((tool) => {
    const matchesCategory = category === "all" ? true : tool.category === category;
    const matchesQuickFilter =
      quickFilter === null
        ? true
        : quickFilter === "popular"
          ? tool.isPopular
          : quickFilter === "new"
            ? tool.isNew
            : tool.isAIPowered;

    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [
            tool.name,
            tool.description,
            tool.detail,
            TOOLKIT_CATEGORY_LABELS[tool.category],
            tool.isAIPowered ? "ai powered" : "",
            ...TOOLKIT_PROMOTED_TAGS,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    return matchesCategory && matchesQuickFilter && matchesQuery;
  });
}

export function formatToolkitUsageCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}
