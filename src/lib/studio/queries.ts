import { SupabaseClient } from "@supabase/supabase-js";
import type {
  StudioProject,
  StudioScriptDocument,
  StudioScriptVersion,
  StudioScene,
  StudioEntity,
  StudioAsset,
  StudioShareLink,
  StudioStoryCore,
  StudioBeat,
  StudioFocusRoom,
  StudioRoomMessage,
  StudioProposedChange,
  StudioDocument,
  StudioChatThread,
  StudioChatMessage,
} from "@/types/studio";

// ── Projects ──────────────────────────────────────────────

export async function getStudioProjects(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("studio_projects")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as StudioProject[];
}

export async function getStudioProject(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) throw error;
  return data as StudioProject;
}

// ── Script ────────────────────────────────────────────────

export async function getStudioScript(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_script_documents")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error) throw error;
  return data as StudioScriptDocument;
}

// ── Versions ──────────────────────────────────────────────

export async function getStudioVersions(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_script_versions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as StudioScriptVersion[];
}

// ── Scenes ────────────────────────────────────────────────

export async function getStudioScenes(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");

  if (error) throw error;
  return data as StudioScene[];
}

// ── Entities ──────────────────────────────────────────────

export async function getStudioEntities(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_entities")
    .select("*")
    .eq("project_id", projectId)
    .order("entity_type")
    .order("name");

  if (error) throw error;
  return data as StudioEntity[];
}

// ── Assets ────────────────────────────────────────────────

export async function getStudioAssets(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as StudioAsset[];
}

// ── Share Links ───────────────────────────────────────────

export async function getStudioShareLinks(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_share_links")
    .select("*")
    .eq("project_id", projectId);

  if (error) throw error;
  return data as StudioShareLink[];
}

// ── Documents ─────────────────────────────────────────────

export async function getStudioDocuments(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("path");

  if (error) throw error;
  return data as StudioDocument[];
}

export async function getStudioDocument(supabase: SupabaseClient, documentId: string) {
  const { data, error } = await supabase
    .from("studio_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error) throw error;
  return data as StudioDocument;
}

// ── Chat ─────────────────────────────────────────────────

export async function getStudioDefaultChatThread(
  supabase: SupabaseClient,
  projectId: string
) {
  const { data, error } = await supabase
    .from("studio_chat_threads")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_default", true)
    .order("created_at")
    .limit(1);

  if (error) throw error;
  return (data?.[0] ?? null) as StudioChatThread | null;
}

export async function getStudioChatThread(supabase: SupabaseClient, threadId: string) {
  const { data, error } = await supabase
    .from("studio_chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (error) throw error;
  return data as StudioChatThread;
}

export async function getStudioChatMessages(
  supabase: SupabaseClient,
  threadId: string
) {
  const { data, error } = await supabase
    .from("studio_chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data as StudioChatMessage[]).reverse();
}

// ── Story Core ───────────────────────────────────────────

export async function getStudioStoryCore(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_story_core")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data as StudioStoryCore | null;
}

// ── Beats ────────────────────────────────────────────────

export async function getStudioBeats(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_beats")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");

  if (error) throw error;
  return data as StudioBeat[];
}

// ── Focus Rooms ──────────────────────────────────────────

export async function getStudioRooms(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("studio_focus_rooms")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as StudioFocusRoom[];
}

export async function getStudioRoom(supabase: SupabaseClient, roomId: string) {
  const { data, error } = await supabase
    .from("studio_focus_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error) throw error;
  return data as StudioFocusRoom;
}

export async function getStudioRoomMessages(supabase: SupabaseClient, roomId: string) {
  const { data, error } = await supabase
    .from("studio_room_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at");

  if (error) throw error;
  return data as StudioRoomMessage[];
}

// ── Proposed Changes ─────────────────────────────────────

export async function getStudioProposedChanges(
  supabase: SupabaseClient,
  projectId: string,
  status?: string
) {
  let query = supabase
    .from("studio_proposed_changes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as StudioProposedChange[];
}
