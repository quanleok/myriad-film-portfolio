export type ResourceCategory =
  | "character_pack"
  | "prompt_template"
  | "style_preset"
  | "location_pack"
  | "sound"
  | "workflow"
  | "prop_pack";

export type ResourceLicense = "free" | "attribution" | "premium";
export type ResourceSort = "popular" | "newest" | "liked" | "discussed";
export type ResourceQuickFilter = "popular" | "new" | "featured";

export interface ResourceCreatorSummary {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ResourceFileRecord {
  id: string;
  resource_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
}

export interface ResourceCommentRecord {
  id: string;
  resource_id: string;
  user_id: string;
  body: string;
  created_at: string;
  creator: ResourceCreatorSummary | null;
}

export interface ResourceSummary {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  tags: string[];
  thumbnail_url: string | null;
  download_count: number;
  like_count: number;
  comment_count: number;
  is_featured: boolean;
  is_published: boolean;
  license: ResourceLicense;
  created_at: string;
  updated_at: string;
  creator: ResourceCreatorSummary | null;
  isSample?: boolean;
}

export interface ResourceDetail extends ResourceSummary {
  files: ResourceFileRecord[];
  comments: ResourceCommentRecord[];
  likedByViewer: boolean;
}

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  character_pack: "Character Pack",
  prompt_template: "Prompt Template",
  style_preset: "Style Preset",
  location_pack: "Location Pack",
  sound: "Sound / Music",
  workflow: "Workflow Guide",
  prop_pack: "Prop Pack",
};

export const RESOURCE_CATEGORY_SHORT_LABELS: Record<ResourceCategory, string> = {
  character_pack: "Characters",
  prompt_template: "Prompts",
  style_preset: "Styles",
  location_pack: "Locations",
  sound: "Sound",
  workflow: "Workflows",
  prop_pack: "Props",
};

export const RESOURCE_SORT_LABELS: Record<ResourceSort, string> = {
  popular: "Popular",
  newest: "Newest",
  liked: "Most liked",
  discussed: "Most discussed",
};

export const RESOURCE_LICENSE_LABELS: Record<ResourceLicense, string> = {
  free: "Free",
  attribution: "Attribution",
  premium: "Premium",
};

export const RESOURCE_UPLOAD_CATEGORY_OPTIONS = Object.entries(
  RESOURCE_CATEGORY_LABELS
).map(([value, label]) => ({ value: value as ResourceCategory, label }));

export const RESOURCE_LICENSE_OPTIONS = Object.entries(RESOURCE_LICENSE_LABELS).map(
  ([value, label]) => ({ value: value as ResourceLicense, label })
);

export const RESOURCE_QUICK_FILTERS: Array<{
  key: ResourceQuickFilter;
  label: string;
  hint: string;
}> = [
  { key: "popular", label: "Popular", hint: "Most downloaded" },
  { key: "new", label: "New", hint: "Fresh uploads" },
  { key: "featured", label: "Featured", hint: "Editor picks" },
];

export const RESOURCE_TAG_SUGGESTIONS = [
  "medieval",
  "sci-fi",
  "anime",
  "cinematic",
  "seedance",
  "character",
  "fantasy",
  "prompt",
  "workflow",
  "sound design",
] as const;

const SAMPLE_CREATOR_A: ResourceCreatorSummary = {
  id: "sample-jakecreates",
  username: "jakecreates",
  display_name: "Jake Creates",
  avatar_url: null,
};

const SAMPLE_CREATOR_B: ResourceCreatorSummary = {
  id: "sample-maya",
  username: "maya",
  display_name: "Maya",
  avatar_url: null,
};

const SAMPLE_CREATOR_C: ResourceCreatorSummary = {
  id: "sample-sean",
  username: "sean",
  display_name: "Sean",
  avatar_url: null,
};

function isoDaysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString();
}

export const SAMPLE_RESOURCES: ResourceDetail[] = [
  {
    id: "sample-medieval-knight-pack",
    user_id: SAMPLE_CREATOR_A.id,
    title: "Medieval Knight Character Pack",
    description:
      "Turnaround sheet, prompt block, expression card, and palette for a battle-worn fantasy knight built for fast Seedance continuity.",
    category: "character_pack",
    tags: ["medieval", "knight", "fantasy", "seedance", "character"],
    thumbnail_url: null,
    download_count: 2418,
    like_count: 47,
    comment_count: 12,
    is_featured: true,
    is_published: true,
    license: "free",
    created_at: isoDaysAgo(3),
    updated_at: isoDaysAgo(1),
    creator: SAMPLE_CREATOR_A,
    likedByViewer: false,
    isSample: true,
    files: [
      {
        id: "sample-file-knight-1",
        resource_id: "sample-medieval-knight-pack",
        file_url: "#",
        file_name: "knight-turnaround.png",
        file_type: "image",
        file_size_bytes: 4_200_000,
        sort_order: 0,
        created_at: isoDaysAgo(3),
      },
      {
        id: "sample-file-knight-2",
        resource_id: "sample-medieval-knight-pack",
        file_url: "#",
        file_name: "prompt-description.txt",
        file_type: "text",
        file_size_bytes: 2_048,
        sort_order: 1,
        created_at: isoDaysAgo(3),
      },
    ],
    comments: [
      {
        id: "sample-comment-knight-1",
        resource_id: "sample-medieval-knight-pack",
        user_id: SAMPLE_CREATOR_B.id,
        body: "Used this in a teaser and it held continuity across 15 shots.",
        created_at: isoDaysAgo(2),
        creator: SAMPLE_CREATOR_B,
      },
    ],
  },
  {
    id: "sample-battle-scene-template",
    user_id: SAMPLE_CREATOR_B.id,
    title: "Epic Battle Scene Prompt Template",
    description:
      "A modular scene prompt for crowd movement, weapon clashes, smoke layers, and camera staging with fill-in placeholders.",
    category: "prompt_template",
    tags: ["battle", "prompt", "seedance", "cinematic"],
    thumbnail_url: null,
    download_count: 893,
    like_count: 28,
    comment_count: 4,
    is_featured: true,
    is_published: true,
    license: "attribution",
    created_at: isoDaysAgo(2),
    updated_at: isoDaysAgo(1),
    creator: SAMPLE_CREATOR_B,
    likedByViewer: false,
    isSample: true,
    files: [
      {
        id: "sample-file-battle-1",
        resource_id: "sample-battle-scene-template",
        file_url: "#",
        file_name: "battle-template.md",
        file_type: "text",
        file_size_bytes: 3_200,
        sort_order: 0,
        created_at: isoDaysAgo(2),
      },
    ],
    comments: [],
  },
  {
    id: "sample-dark-fantasy-style",
    user_id: SAMPLE_CREATOR_C.id,
    title: "Dark Fantasy Grit Style Preset",
    description:
      "Shadow-heavy grading, cold ambient palette, smoke cues, and film grain language tuned for moody fantasy shorts.",
    category: "style_preset",
    tags: ["dark fantasy", "style", "grade", "cinematic"],
    thumbnail_url: null,
    download_count: 1116,
    like_count: 59,
    comment_count: 7,
    is_featured: true,
    is_published: true,
    license: "free",
    created_at: isoDaysAgo(4),
    updated_at: isoDaysAgo(1),
    creator: SAMPLE_CREATOR_C,
    likedByViewer: false,
    isSample: true,
    files: [
      {
        id: "sample-file-style-1",
        resource_id: "sample-dark-fantasy-style",
        file_url: "#",
        file_name: "dark-fantasy-style.json",
        file_type: "json",
        file_size_bytes: 1_200,
        sort_order: 0,
        created_at: isoDaysAgo(4),
      },
    ],
    comments: [],
  },
  {
    id: "sample-castle-location-pack",
    user_id: SAMPLE_CREATOR_A.id,
    title: "Castle Interior Location Pack",
    description:
      "Torchlit halls, throne room, crypt tunnel, and war council chamber with angle notes and continuity descriptions.",
    category: "location_pack",
    tags: ["castle", "location", "medieval", "interior"],
    thumbnail_url: null,
    download_count: 642,
    like_count: 21,
    comment_count: 3,
    is_featured: false,
    is_published: true,
    license: "free",
    created_at: isoDaysAgo(5),
    updated_at: isoDaysAgo(3),
    creator: SAMPLE_CREATOR_A,
    likedByViewer: false,
    isSample: true,
    files: [],
    comments: [],
  },
  {
    id: "sample-fight-sfx-pack",
    user_id: SAMPLE_CREATOR_C.id,
    title: "Sword Fight SFX Pack",
    description:
      "Metal clashes, cloth swishes, shield hits, and distant crowd ambience for battle edits and AI trailer polish.",
    category: "sound",
    tags: ["sound", "sfx", "sword", "battle"],
    thumbnail_url: null,
    download_count: 730,
    like_count: 35,
    comment_count: 2,
    is_featured: false,
    is_published: true,
    license: "free",
    created_at: isoDaysAgo(6),
    updated_at: isoDaysAgo(3),
    creator: SAMPLE_CREATOR_C,
    likedByViewer: false,
    isSample: true,
    files: [],
    comments: [],
  },
  {
    id: "sample-seedance-workflow",
    user_id: SAMPLE_CREATOR_B.id,
    title: "2-Minute Seedance Workflow Guide",
    description:
      "A repeatable short-film pipeline from script beats to final export, including prompt cadence, continuity checks, and finishing passes.",
    category: "workflow",
    tags: ["workflow", "seedance", "guide", "pipeline"],
    thumbnail_url: null,
    download_count: 508,
    like_count: 19,
    comment_count: 6,
    is_featured: false,
    is_published: true,
    license: "attribution",
    created_at: isoDaysAgo(1),
    updated_at: isoDaysAgo(1),
    creator: SAMPLE_CREATOR_B,
    likedByViewer: false,
    isSample: true,
    files: [],
    comments: [],
  },
  {
    id: "sample-fantasy-props",
    user_id: SAMPLE_CREATOR_A.id,
    title: "Fantasy Weapons Prop Pack",
    description:
      "Prompt-ready prop descriptions for sword, shield, bow, staff, and battle-worn armor details across wide and close shots.",
    category: "prop_pack",
    tags: ["prop", "weapons", "fantasy", "armor"],
    thumbnail_url: null,
    download_count: 384,
    like_count: 16,
    comment_count: 1,
    is_featured: false,
    is_published: true,
    license: "free",
    created_at: isoDaysAgo(7),
    updated_at: isoDaysAgo(4),
    creator: SAMPLE_CREATOR_A,
    likedByViewer: false,
    isSample: true,
    files: [],
    comments: [],
  },
];

export function parseResourceCategory(value?: string | null) {
  if (!value) return "all" as const;
  return value in RESOURCE_CATEGORY_LABELS ? (value as ResourceCategory) : ("all" as const);
}

export function parseResourceSort(value?: string | null): ResourceSort {
  if (!value) return "popular";
  return value in RESOURCE_SORT_LABELS ? (value as ResourceSort) : "popular";
}

export function parseResourceQuickFilter(value?: string | null): ResourceQuickFilter | null {
  if (!value) return null;
  return RESOURCE_QUICK_FILTERS.some((option) => option.key === value)
    ? (value as ResourceQuickFilter)
    : null;
}

export function formatResourceCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatFileSize(value: number | null) {
  if (!value) return "Unknown";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} KB`;
  return `${value} B`;
}

export function filterAndSortResources({
  resources,
  query,
  category,
  tag,
  sort,
  quickFilter,
}: {
  resources: ResourceSummary[];
  query: string;
  category: ResourceCategory | "all";
  tag: string | null;
  sort: ResourceSort;
  quickFilter: ResourceQuickFilter | null;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = resources.filter((resource) => {
    const matchesCategory = category === "all" ? true : resource.category === category;
    const matchesTag = tag ? resource.tags.includes(tag) : true;
    const matchesQuick =
      quickFilter === null
        ? true
        : quickFilter === "popular"
          ? resource.download_count > 500
          : quickFilter === "new"
            ? Date.now() - new Date(resource.created_at).getTime() < 1000 * 60 * 60 * 24 * 14
            : resource.is_featured;
    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [
            resource.title,
            resource.description ?? "",
            RESOURCE_CATEGORY_LABELS[resource.category],
            resource.creator?.display_name ?? "",
            resource.creator?.username ?? "",
            ...resource.tags,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    return matchesCategory && matchesTag && matchesQuick && matchesQuery;
  });

  return filtered.sort((left, right) => {
    if (sort === "newest") {
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    }
    if (sort === "liked") {
      return right.like_count - left.like_count;
    }
    if (sort === "discussed") {
      return right.comment_count - left.comment_count;
    }
    return (
      right.download_count - left.download_count ||
      Number(right.is_featured) - Number(left.is_featured) ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });
}

export function getResourceCategoryCounts(resources: ResourceSummary[]) {
  const counts: Record<ResourceCategory, number> = {
    character_pack: 0,
    prompt_template: 0,
    style_preset: 0,
    location_pack: 0,
    sound: 0,
    workflow: 0,
    prop_pack: 0,
  };

  resources.forEach((resource) => {
    counts[resource.category] += 1;
  });

  return counts;
}

export function getPopularTags(resources: ResourceSummary[], limit = 10) {
  const counts = new Map<string, number>();

  resources.forEach((resource) => {
    resource.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export function getSeededResourcesIfNeeded(realResources: ResourceSummary[]) {
  if (realResources.length >= 10) return realResources;
  return [...realResources, ...SAMPLE_RESOURCES];
}

export function getSeededResourceById(id: string) {
  return SAMPLE_RESOURCES.find((resource) => resource.id === id) ?? null;
}

export function resourceSupportsDownload(resource: ResourceSummary) {
  return !resource.isSample;
}
