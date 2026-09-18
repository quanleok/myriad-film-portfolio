// Studio (Workshop Studio) — production workspace types
// Maps to studio_* tables in Supabase

export type StudioProjectStatus = "draft" | "active" | "review" | "ready_to_render";
export type StudioSceneStatus = "draft" | "in_review" | "approved";
export type StudioEntityType = "character" | "location" | "prop";
export type StudioAssetType = "image" | "video" | "audio" | "document";
export type StudioAssetStatus = "reference" | "candidate" | "approved" | "final";
export type StudioShareAccess = "public" | "reviewer" | "private";
export type StudioAIRunStatus = "queued" | "running" | "completed" | "failed";
export type StudioGenerationJobStatus = "queued" | "preparing" | "rendering" | "completed" | "failed";
export type StudioAIProviderId = "openclaw" | "manual";
export type StudioAITaskKind =
  | "script_rewrite"
  | "scene_expand"
  | "character_generate"
  | "media_generate"
  | "render_kickoff";
export type StudioChatRole = "user" | "assistant" | "system";

export interface StudioProject {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  logline: string;
  status: StudioProjectStatus;
  genre: string;
  format: "feature" | "short" | "series";
  created_at: string;
  updated_at: string;
}

export interface StudioProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: "editor" | "viewer";
  created_at: string;
}

export interface StudioScriptDocument {
  id: string;
  project_id: string;
  format: "fountain";
  current_version_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface StudioScriptVersion {
  id: string;
  project_id: string;
  script_document_id: string;
  label: string;
  summary: string;
  author_type: "user" | "ai";
  provider_id: StudioAIProviderId | null;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface StudioScene {
  id: string;
  project_id: string;
  title: string;
  status: StudioSceneStatus;
  beat: string;
  script_excerpt: string;
  sort_order: number;
  dialogue_blocks: Array<{ character: string; lines: string }>;
  created_at: string;
  updated_at: string;
}

export interface StudioEntity {
  id: string;
  project_id: string;
  entity_type: StudioEntityType;
  name: string;
  summary: string;
  tags: string[];
  backstory: string;
  motivation: string;
  arc: string;
  relationships: Array<{ entity_id: string; label: string }>;
  visual_description: string;
  created_at: string;
  updated_at: string;
}

export type StudioAssetTab = "character" | "location" | "prop";

export interface StudioAsset {
  id: string;
  project_id: string;
  asset_type: StudioAssetType;
  status: StudioAssetStatus;
  title: string;
  description: string;
  provider_id: StudioAIProviderId | null;
  prompt: string | null;
  source_url: string | null;
  storage_key: string | null;
  metadata_json: Record<string, unknown>;
  tab: StudioAssetTab | null;
  folder_path: string;
  created_at: string;
  updated_at: string;
}

export interface StudioAIThread {
  id: string;
  project_id: string;
  title: string;
  context_type: "project" | "scene" | "entity" | "asset";
  context_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioAIRun {
  id: string;
  project_id: string;
  thread_id: string | null;
  provider_id: StudioAIProviderId;
  task_kind: StudioAITaskKind;
  status: StudioAIRunStatus;
  target_type: "project" | "scene" | "entity" | "asset";
  target_id: string | null;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioGenerationJob {
  id: string;
  project_id: string;
  provider_id: StudioAIProviderId;
  status: StudioGenerationJobStatus;
  asset_type: "image" | "video" | "audio";
  label: string;
  cost_cents: number;
  output_asset_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StudioShareLink {
  id: string;
  project_id: string;
  slug: string;
  access: StudioShareAccess;
  allow_downloads: boolean;
  expires_at: string | null;
  created_at: string;
}


export interface StudioChatThread {
  id: string;
  project_id: string;
  title: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioChatMessage {
  id: string;
  thread_id: string;
  project_id: string;
  role: StudioChatRole;
  content: string;
  referenced_document_ids: string[];
  metadata_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

// ── Script System Overhaul Types ──────────────────────────

export type StudioBeatType =
  | "opening"
  | "inciting_incident"
  | "first_turn"
  | "midpoint"
  | "second_turn"
  | "climax"
  | "resolution"
  | "custom";

export type StudioAct = "" | "act_1" | "act_2a" | "act_2b" | "act_3";

export type StudioRoomType = "character" | "beat" | "scene" | "dialogue";
export type StudioRoomTargetType =
  | "entity"
  | "beat"
  | "scene"
  | "script_excerpt"
  | "story_core";
export type StudioRoomStatus = "active" | "archived";
export type StudioMessageRole = "user" | "assistant" | "system";
export type StudioChangeTargetType = "entity" | "beat" | "scene" | "script_excerpt" | "story_core";
export type StudioChangeType = "update" | "create" | "delete";
export type StudioChangeStatus = "pending" | "accepted" | "rejected";
export type StudioWriterStatus =
  | "idea"
  | "working_canon"
  | "locked_canon"
  | "unresolved";

export interface StudioStoryCore {
  id: string;
  project_id: string;
  premise: string;
  theme: string;
  tone: string;
  setting: string;
  time_period: string;
  world_rules: string[];
  synopsis: string;
  created_at: string;
  updated_at: string;
}

export interface StudioBeat {
  id: string;
  project_id: string;
  title: string;
  description: string;
  act: StudioAct;
  beat_type: StudioBeatType;
  sort_order: number;
  status: StudioSceneStatus;
  linked_scene_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface StudioFocusRoom {
  id: string;
  project_id: string;
  room_type: StudioRoomType;
  target_type: StudioRoomTargetType;
  target_id: string | null;
  title: string;
  canon_snapshot: Record<string, unknown>;
  locked_facts: string[];
  status: StudioRoomStatus;
  created_at: string;
  updated_at: string;
}

export interface StudioRoomMessage {
  id: string;
  room_id: string;
  project_id: string;
  role: StudioMessageRole;
  content: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface StudioProposedChange {
  id: string;
  room_id: string;
  project_id: string;
  target_type: StudioChangeTargetType;
  target_id: string | null;
  change_type: StudioChangeType;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  summary: string;
  status: StudioChangeStatus;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

// ── Documents (file-based workspace) ─────────────────────

export type StudioDocumentKind = "text" | "markdown" | "fountain" | "notes";

export interface StudioDocument {
  id: string;
  project_id: string;
  path: string;
  title: string;
  content: string;
  kind: StudioDocumentKind;
  is_folder: boolean;
  parent_path: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type StudioStorySelection =
  | { kind: "story_core"; data: StudioStoryCore }
  | { kind: "character"; data: StudioEntity }
  | { kind: "beat"; data: StudioBeat }
  | { kind: "scene"; data: StudioScene };
