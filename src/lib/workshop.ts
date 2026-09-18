export type WorkshopPrimaryTab =
  | "script"
  | "characters"
  | "gallery";

export type WorkshopAssetStatus = "rough" | "candidate" | "approved" | "final";
export type WorkshopAssetCategory =
  | "generated_video"
  | "reference_image"
  | "location"
  | "character_sheet"
  | "mixed";

export type WorkshopSceneStatus = "draft" | "in_progress" | "approved";

export interface WorkshopGenerationMeta {
  model_name?: string;
  prompt?: string;
  negative_prompt?: string;
  seed?: string;
  duration_seconds?: number | null;
  aspect_ratio?: string;
  notes?: string;
}

export interface WorkshopAsset {
  id: string;
  project_id: string;
  owner_id: string;
  title: string;
  caption: string | null;
  media_type: "image" | "video";
  storage_kind: string;
  url: string | null;
  asset_id: string | null;
  status: WorkshopAssetStatus;
  tags: string[];
  asset_category: WorkshopAssetCategory;
  linked_scene_ids: string[];
  linked_character_ids: string[];
  generation_meta: WorkshopGenerationMeta;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScriptAct {
  id: string;
  label: string;
}

export interface WorkshopScriptContent {
  logline: string;
  synopsis: string;
  concept_notes: string;
  world_notes: string;
  screenplay_text: string;
  acts: ScriptAct[];
}

export interface WorkshopSceneContent {
  title: string;
  description: string;
  status: WorkshopSceneStatus;
  act_id: string | null;
  script_excerpt: string;
  linked_character_ids: string[];
  linked_asset_ids: string[];
  linked_video_asset_ids: string[];
  scene_order: number;
}

export interface WorkshopCharacterContent {
  name: string;
  description: string;
  role: string;
  look_notes: string;
  cover_asset_id: string | null;
  angles: Record<string, string>;
  extra_media: Array<{ url: string; type: string; caption?: string }>;
  linked_scene_ids: string[];
  linked_asset_ids: string[];
}

export const WORKSHOP_ASSET_CATEGORIES: Array<{
  value: WorkshopAssetCategory;
  label: string;
}> = [
  { value: "generated_video", label: "Generated Video" },
  { value: "reference_image", label: "Reference Image" },
  { value: "location", label: "Location" },
  { value: "character_sheet", label: "Character Sheet" },
  { value: "mixed", label: "Mixed" },
];

export const WORKSHOP_ASSET_STATUS_LABELS: Record<WorkshopAssetStatus, string> = {
  rough: "Rough",
  candidate: "Candidate",
  approved: "Approved",
  final: "Final",
};

export const WORKSHOP_SCENE_STATUS_LABELS: Record<WorkshopSceneStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  approved: "Approved",
};

export const WORKSHOP_ASSET_STATUS_PRIORITY: Record<WorkshopAssetStatus, number> = {
  final: 0,
  approved: 1,
  candidate: 2,
  rough: 3,
};

export function normalizeScriptContent(content: Record<string, unknown> | null | undefined): WorkshopScriptContent {
  const legacyText = typeof content?.text === "string" ? content.text : "";
  const acts = Array.isArray(content?.acts)
    ? content!.acts
        .map((act) => {
          if (!act || typeof act !== "object") return null;
          const record = act as Record<string, unknown>;
          const id = typeof record.id === "string" && record.id ? record.id : `act-${Math.random().toString(36).slice(2, 8)}`;
          const label = typeof record.label === "string" && record.label.trim()
            ? record.label.trim()
            : "Untitled Act";
          return { id, label };
        })
        .filter((act): act is ScriptAct => Boolean(act))
    : [];

  return {
    logline: typeof content?.logline === "string" ? content.logline : "",
    synopsis: typeof content?.synopsis === "string" ? content.synopsis : "",
    concept_notes: typeof content?.concept_notes === "string" ? content.concept_notes : "",
    world_notes: typeof content?.world_notes === "string" ? content.world_notes : "",
    screenplay_text:
      typeof content?.screenplay_text === "string"
        ? content.screenplay_text
        : legacyText,
    acts: acts.length > 0
      ? acts
      : [
          { id: "act-1", label: "Act I" },
          { id: "act-2", label: "Act II" },
          { id: "act-3", label: "Act III" },
        ],
  };
}

export function normalizeSceneContent(content: Record<string, unknown> | null | undefined): WorkshopSceneContent {
  const linkedAssetIds = Array.isArray(content?.linked_asset_ids)
    ? content!.linked_asset_ids.filter((value): value is string => typeof value === "string")
    : [];
  const linkedVideoAssetIds = Array.isArray(content?.linked_video_asset_ids)
    ? content!.linked_video_asset_ids.filter((value): value is string => typeof value === "string")
    : [];

  return {
    title: typeof content?.title === "string" ? content.title : "",
    description: typeof content?.description === "string" ? content.description : "",
    status:
      content?.status === "in_progress" || content?.status === "approved"
        ? content.status
        : "draft",
    act_id: typeof content?.act_id === "string" ? content.act_id : null,
    script_excerpt: typeof content?.script_excerpt === "string" ? content.script_excerpt : "",
    linked_character_ids: Array.isArray(content?.linked_character_ids)
      ? content!.linked_character_ids.filter((value): value is string => typeof value === "string")
      : [],
    linked_asset_ids: linkedAssetIds,
    linked_video_asset_ids: linkedVideoAssetIds,
    scene_order:
      typeof content?.scene_order === "number" && Number.isFinite(content.scene_order)
        ? content.scene_order
        : 0,
  };
}

export function normalizeCharacterContent(content: Record<string, unknown> | null | undefined): WorkshopCharacterContent {
  const anglesSource = content?.angles;
  const angles = anglesSource && typeof anglesSource === "object" ? (anglesSource as Record<string, string>) : {};

  return {
    name: typeof content?.name === "string" ? content.name : "",
    description: typeof content?.description === "string" ? content.description : "",
    role: typeof content?.role === "string" && content.role ? content.role : "other",
    look_notes: typeof content?.look_notes === "string" ? content.look_notes : "",
    cover_asset_id: typeof content?.cover_asset_id === "string" ? content.cover_asset_id : null,
    angles,
    extra_media: Array.isArray(content?.extra_media)
      ? content!.extra_media.filter(
          (entry): entry is { url: string; type: string; caption?: string } =>
            Boolean(entry) && typeof entry === "object" && typeof (entry as { url?: unknown }).url === "string"
        )
      : [],
    linked_scene_ids: Array.isArray(content?.linked_scene_ids)
      ? content!.linked_scene_ids.filter((value): value is string => typeof value === "string")
      : [],
    linked_asset_ids: Array.isArray(content?.linked_asset_ids)
      ? content!.linked_asset_ids.filter((value): value is string => typeof value === "string")
      : [],
  };
}

export function normalizeWorkshopAsset(asset: Partial<WorkshopAsset> & { id: string }): WorkshopAsset {
  return {
    id: asset.id,
    project_id: asset.project_id ?? "",
    owner_id: asset.owner_id ?? "",
    title: asset.title ?? "",
    caption: asset.caption ?? null,
    media_type: asset.media_type === "video" ? "video" : "image",
    storage_kind: asset.storage_kind ?? (asset.media_type === "video" ? "bunny_video" : "supabase_image"),
    url: asset.url ?? null,
    asset_id: asset.asset_id ?? null,
    status: asset.status ?? "rough",
    tags: Array.isArray(asset.tags) ? asset.tags : [],
    asset_category: asset.asset_category ?? (asset.media_type === "video" ? "generated_video" : "mixed"),
    linked_scene_ids: Array.isArray(asset.linked_scene_ids) ? asset.linked_scene_ids : [],
    linked_character_ids: Array.isArray(asset.linked_character_ids) ? asset.linked_character_ids : [],
    generation_meta:
      asset.generation_meta && typeof asset.generation_meta === "object"
        ? asset.generation_meta
        : {},
    sort_order: typeof asset.sort_order === "number" ? asset.sort_order : 0,
    created_at: asset.created_at ?? new Date().toISOString(),
    updated_at: asset.updated_at ?? new Date().toISOString(),
  };
}

export function getWorkshopAssetPlaybackUrl(asset: Pick<WorkshopAsset, "media_type" | "storage_kind" | "url" | "asset_id">, quality: "480p" | "720p" = "720p") {
  if (asset.media_type === "video" && asset.storage_kind === "bunny_video" && asset.asset_id) {
    const host = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || "vz-4cbb521a-e16.b-cdn.net";
    return `https://${host}/${asset.asset_id}/play_${quality}.mp4`;
  }
  return asset.url;
}

export function getWorkshopAssetThumbnailUrl(asset: Pick<WorkshopAsset, "media_type" | "storage_kind" | "url" | "asset_id">) {
  if (asset.media_type === "video" && asset.storage_kind === "bunny_video" && asset.asset_id) {
    const host = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || "vz-4cbb521a-e16.b-cdn.net";
    return `https://${host}/${asset.asset_id}/thumbnail.jpg`;
  }
  return asset.url;
}

export function getCharacterLinkedAssets(characterId: string, assets: WorkshopAsset[]) {
  return assets.filter((asset) => asset.linked_character_ids.includes(characterId));
}

export function sortCharacterAssetsForDisplay(
  assets: WorkshopAsset[],
  coverAssetId: string | null = null
) {
  return [...assets].sort((left, right) => {
    const leftIsCover = coverAssetId !== null && left.id === coverAssetId;
    const rightIsCover = coverAssetId !== null && right.id === coverAssetId;

    if (leftIsCover !== rightIsCover) {
      return leftIsCover ? -1 : 1;
    }

    const leftPriority = WORKSHOP_ASSET_STATUS_PRIORITY[left.status] ?? 999;
    const rightPriority = WORKSHOP_ASSET_STATUS_PRIORITY[right.status] ?? 999;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const createdDelta =
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    if (createdDelta !== 0) {
      return createdDelta;
    }

    return left.sort_order - right.sort_order;
  });
}

export function getCharacterCoverAsset(
  character: Pick<WorkshopCharacterContent, "cover_asset_id" | "angles" | "extra_media">,
  assets: WorkshopAsset[]
) {
  if (character.cover_asset_id) {
    const explicitCover = assets.find((asset) => asset.id === character.cover_asset_id);
    if (explicitCover) {
      return explicitCover;
    }
  }

  const firstImage = assets.find((asset) => asset.media_type === "image");
  if (firstImage) {
    return firstImage;
  }

  const firstVideo = assets.find((asset) => asset.media_type === "video");
  if (firstVideo) {
    return firstVideo;
  }

  return null;
}

export function getCharacterCoverThumbnailUrl(
  character: Pick<WorkshopCharacterContent, "cover_asset_id" | "angles" | "extra_media">,
  assets: WorkshopAsset[]
) {
  const coverAsset = getCharacterCoverAsset(character, assets);
  if (coverAsset) {
    return getWorkshopAssetThumbnailUrl(coverAsset);
  }

  if (character.angles.front) {
    return character.angles.front;
  }

  return character.extra_media[0]?.url ?? null;
}

export function splitCharacterAssets(
  character: Pick<WorkshopCharacterContent, "cover_asset_id">,
  assets: WorkshopAsset[]
) {
  const orderedAssets = sortCharacterAssetsForDisplay(assets, character.cover_asset_id);
  return {
    all: orderedAssets,
    images: orderedAssets.filter((asset) => asset.media_type === "image"),
    videos: orderedAssets.filter((asset) => asset.media_type === "video"),
  };
}

export function createScriptAct(label: string): ScriptAct {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return { id, label };
}

export function assetMatchesTab(asset: WorkshopAsset, tab: WorkshopPrimaryTab) {
  if (tab === "gallery") {
    return true;
  }
  return false;
}
