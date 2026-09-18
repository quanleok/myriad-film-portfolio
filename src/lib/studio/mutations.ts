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
import {
  buildStarterStudioDocuments,
  getStudioDocumentKind,
  getStudioDocumentTitle,
  normalizeStudioDocumentPath,
} from "@/lib/studio/documents";

export async function ensureStudioWorkspaceScaffold(
  supabase: SupabaseClient,
  data: { projectId: string; userId: string; title: string; logline?: string }
) {
  const starterDocuments = buildStarterStudioDocuments({
    title: data.title,
    logline: data.logline,
  });

  const { error: documentsError } = await supabase
    .from("studio_documents")
    .upsert(
      starterDocuments.map((document, index) => ({
        project_id: data.projectId,
        path: document.path,
        title: document.title,
        kind: document.kind,
        content: document.content,
        summary: document.summary,
        sort_order: index,
        created_by: data.userId,
        updated_by: data.userId,
      })),
      {
        onConflict: "project_id,path",
        ignoreDuplicates: true,
      }
    );

  if (documentsError) throw documentsError;

  const { data: existingDefaultThreads, error: threadsError } = await supabase
    .from("studio_chat_threads")
    .select("id")
    .eq("project_id", data.projectId)
    .eq("is_default", true)
    .limit(1);

  if (threadsError) throw threadsError;

  if (!existingDefaultThreads?.length) {
    const { error: createThreadError } = await supabase
      .from("studio_chat_threads")
      .insert({
        project_id: data.projectId,
        title: "Main thread",
        is_default: true,
        created_by: data.userId,
      });

    if (createThreadError) throw createThreadError;
  }
}

// ── Projects ──────────────────────────────────────────────

export async function createStudioProject(
  supabase: SupabaseClient,
  userId: string,
  data: { title: string; logline?: string; genre?: string; format?: string }
) {
  const slug =
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) +
    "-" +
    Date.now().toString(36);

  const { data: project, error } = await supabase
    .from("studio_projects")
    .insert({
      owner_id: userId,
      title: data.title.trim(),
      slug,
      logline: data.logline?.trim() || "",
      genre: data.genre?.trim() || "",
      format: data.format || "feature",
    })
    .select()
    .single();

  if (error) throw error;

  // Create the script document for this project
  await supabase
    .from("studio_script_documents")
    .insert({ project_id: (project as StudioProject).id, content: "" });

  // Create the story core for the story map
  await supabase
    .from("studio_story_core")
    .insert({ project_id: (project as StudioProject).id });

  await ensureStudioWorkspaceScaffold(supabase, {
    projectId: (project as StudioProject).id,
    userId,
    title: data.title.trim(),
    logline: data.logline?.trim() || "",
  });

  return project as StudioProject;
}

export async function updateStudioProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  updates: Partial<Pick<StudioProject, "title" | "logline" | "genre" | "format" | "status">>
) {
  const { data: project, error } = await supabase
    .from("studio_projects")
    .update(updates)
    .eq("id", projectId)
    .eq("owner_id", userId)
    .select()
    .single();

  if (error) throw error;
  return project as StudioProject;
}

export async function deleteStudioProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
) {
  const { error } = await supabase
    .from("studio_projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", userId);

  if (error) throw error;
}

// ── Script ────────────────────────────────────────────────

export async function saveStudioScript(
  supabase: SupabaseClient,
  projectId: string,
  content: string
) {
  const { data: script, error } = await supabase
    .from("studio_script_documents")
    .update({ content })
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) throw error;
  return script as StudioScriptDocument;
}

// ── Versions ──────────────────────────────────────────────

export async function createStudioVersion(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  data: { label: string; summary?: string }
) {
  // Get current script content
  const { data: script, error: scriptError } = await supabase
    .from("studio_script_documents")
    .select("id, content")
    .eq("project_id", projectId)
    .single();

  if (scriptError || !script) throw scriptError || new Error("Script not found");

  const { data: version, error } = await supabase
    .from("studio_script_versions")
    .insert({
      project_id: projectId,
      script_document_id: script.id,
      label: data.label.trim(),
      summary: data.summary?.trim() || "",
      author_type: "user" as const,
      provider_id: "manual" as const,
      content: script.content,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Update current_version_id
  await supabase
    .from("studio_script_documents")
    .update({ current_version_id: (version as StudioScriptVersion).id })
    .eq("id", script.id);

  return version as StudioScriptVersion;
}

// ── Scenes ────────────────────────────────────────────────

export async function createStudioScene(
  supabase: SupabaseClient,
  projectId: string,
  data: { title: string; beat?: string; script_excerpt?: string; sort_order?: number }
) {
  const { data: scene, error } = await supabase
    .from("studio_scenes")
    .insert({
      project_id: projectId,
      title: data.title.trim(),
      beat: data.beat?.trim() || "",
      script_excerpt: data.script_excerpt?.trim() || "",
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return scene as StudioScene;
}

// ── Entities ──────────────────────────────────────────────

export async function createStudioEntity(
  supabase: SupabaseClient,
  projectId: string,
  data: { entity_type: string; name: string; summary?: string; tags?: string[] }
) {
  const { data: entity, error } = await supabase
    .from("studio_entities")
    .insert({
      project_id: projectId,
      entity_type: data.entity_type,
      name: data.name.trim(),
      summary: data.summary?.trim() || "",
      tags: data.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return entity as StudioEntity;
}

// ── Assets ────────────────────────────────────────────────

export async function createStudioAsset(
  supabase: SupabaseClient,
  projectId: string,
  data: { asset_type: string; title: string; description?: string; source_url?: string; storage_key?: string }
) {
  const { data: asset, error } = await supabase
    .from("studio_assets")
    .insert({
      project_id: projectId,
      asset_type: data.asset_type,
      title: data.title.trim(),
      description: data.description?.trim() || "",
      source_url: data.source_url || null,
      storage_key: data.storage_key || null,
    })
    .select()
    .single();

  if (error) throw error;
  return asset as StudioAsset;
}

// ── Share Links ───────────────────────────────────────────

export async function createStudioShareLink(
  supabase: SupabaseClient,
  projectId: string,
  data: { access?: string; allow_downloads?: boolean; expires_at?: string }
) {
  const slug = crypto.randomUUID().slice(0, 12);

  const { data: link, error } = await supabase
    .from("studio_share_links")
    .insert({
      project_id: projectId,
      slug,
      access: data.access || "reviewer",
      allow_downloads: data.allow_downloads ?? false,
      expires_at: data.expires_at || null,
    })
    .select()
    .single();

  if (error) throw error;
  return link as StudioShareLink;
}

// ── Documents ─────────────────────────────────────────────

export async function createStudioDocument(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  data: {
    path: string;
    title?: string;
    kind?: string;
    content?: string;
    summary?: string;
    sort_order?: number;
  }
) {
  const normalizedPath = normalizeStudioDocumentPath(data.path);
  const { data: document, error } = await supabase
    .from("studio_documents")
    .insert({
      project_id: projectId,
      path: normalizedPath,
      title: data.title?.trim() || getStudioDocumentTitle(normalizedPath),
      kind: data.kind || getStudioDocumentKind(normalizedPath),
      content: data.content || "",
      summary: data.summary?.trim() || "",
      sort_order: data.sort_order ?? 0,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return document as StudioDocument;
}

export async function updateStudioDocument(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  updates: Partial<
    Pick<StudioDocument, "path" | "title" | "kind" | "content" | "sort_order">
  >
) {
  const nextUpdates: Record<string, unknown> = {
    ...updates,
    updated_by: userId,
  };

  if (typeof updates.path === "string") {
    const normalizedPath = normalizeStudioDocumentPath(updates.path);
    nextUpdates.path = normalizedPath;
    if (!updates.title) {
      nextUpdates.title = getStudioDocumentTitle(normalizedPath);
    }
    if (!updates.kind) {
      nextUpdates.kind = getStudioDocumentKind(normalizedPath);
    }
  }

  const { data: document, error } = await supabase
    .from("studio_documents")
    .update(nextUpdates)
    .eq("id", documentId)
    .select()
    .single();

  if (error) throw error;
  return document as StudioDocument;
}

export async function deleteStudioDocument(
  supabase: SupabaseClient,
  documentId: string
) {
  const { error } = await supabase
    .from("studio_documents")
    .delete()
    .eq("id", documentId);

  if (error) throw error;
}

// ── Chat ─────────────────────────────────────────────────

export async function createStudioChatThread(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  data: { title: string; is_default?: boolean }
) {
  const { data: thread, error } = await supabase
    .from("studio_chat_threads")
    .insert({
      project_id: projectId,
      title: data.title.trim(),
      is_default: data.is_default ?? false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return thread as StudioChatThread;
}

export async function createStudioChatMessage(
  supabase: SupabaseClient,
  threadId: string,
  projectId: string,
  userId: string | null,
  data: {
    role: string;
    content: string;
    referenced_document_ids?: string[];
    metadata_json?: Record<string, unknown>;
  }
) {
  const { data: message, error } = await supabase
    .from("studio_chat_messages")
    .insert({
      thread_id: threadId,
      project_id: projectId,
      role: data.role,
      content: data.content,
      referenced_document_ids: data.referenced_document_ids || [],
      metadata_json: data.metadata_json || {},
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return message as StudioChatMessage;
}

// ── Story Core ───────────────────────────────────────────

export async function upsertStudioStoryCore(
  supabase: SupabaseClient,
  projectId: string,
  data: Partial<Omit<StudioStoryCore, "id" | "project_id" | "created_at" | "updated_at">>
) {
  const { data: core, error } = await supabase
    .from("studio_story_core")
    .upsert({ project_id: projectId, ...data }, { onConflict: "project_id" })
    .select()
    .single();

  if (error) throw error;
  return core as StudioStoryCore;
}

// ── Beats ────────────────────────────────────────────────

export async function createStudioBeat(
  supabase: SupabaseClient,
  projectId: string,
  data: { title: string; description?: string; act?: string; beat_type?: string; sort_order?: number }
) {
  const { data: beat, error } = await supabase
    .from("studio_beats")
    .insert({
      project_id: projectId,
      title: data.title.trim(),
      description: data.description?.trim() || "",
      act: data.act || "",
      beat_type: data.beat_type || "custom",
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return beat as StudioBeat;
}

export async function updateStudioBeat(
  supabase: SupabaseClient,
  beatId: string,
  updates: Partial<Pick<StudioBeat, "title" | "description" | "act" | "beat_type" | "sort_order" | "status" | "linked_scene_ids">>
) {
  const { data: beat, error } = await supabase
    .from("studio_beats")
    .update(updates)
    .eq("id", beatId)
    .select()
    .single();

  if (error) throw error;
  return beat as StudioBeat;
}

export async function deleteStudioBeat(supabase: SupabaseClient, beatId: string) {
  const { error } = await supabase
    .from("studio_beats")
    .delete()
    .eq("id", beatId);

  if (error) throw error;
}

// ── Focus Rooms ──────────────────────────────────────────

export async function createStudioRoom(
  supabase: SupabaseClient,
  projectId: string,
  data: {
    room_type: string;
    target_type: string;
    target_id?: string;
    title: string;
    canon_snapshot?: Record<string, unknown>;
    locked_facts?: string[];
  }
) {
  const { data: room, error } = await supabase
    .from("studio_focus_rooms")
    .insert({
      project_id: projectId,
      room_type: data.room_type,
      target_type: data.target_type,
      target_id: data.target_id || null,
      title: data.title.trim(),
      canon_snapshot: data.canon_snapshot || {},
      locked_facts: data.locked_facts || [],
    })
    .select()
    .single();

  if (error) throw error;
  return room as StudioFocusRoom;
}

export async function updateStudioRoom(
  supabase: SupabaseClient,
  roomId: string,
  updates: Partial<Pick<StudioFocusRoom, "title" | "canon_snapshot" | "locked_facts" | "status">>
) {
  const { data: room, error } = await supabase
    .from("studio_focus_rooms")
    .update(updates)
    .eq("id", roomId)
    .select()
    .single();

  if (error) throw error;
  return room as StudioFocusRoom;
}

// ── Room Messages ────────────────────────────────────────

export async function createStudioRoomMessage(
  supabase: SupabaseClient,
  roomId: string,
  projectId: string,
  data: { role: string; content: string; metadata_json?: Record<string, unknown> }
) {
  const { data: message, error } = await supabase
    .from("studio_room_messages")
    .insert({
      room_id: roomId,
      project_id: projectId,
      role: data.role,
      content: data.content,
      metadata_json: data.metadata_json || {},
    })
    .select()
    .single();

  if (error) throw error;
  return message as StudioRoomMessage;
}

// ── Proposed Changes ─────────────────────────────────────

function targetTypeToTable(targetType: string): string | null {
  switch (targetType) {
    case "entity": return "studio_entities";
    case "beat": return "studio_beats";
    case "scene": return "studio_scenes";
    case "story_core": return "studio_story_core";
    default: return null;
  }
}

export async function createStudioProposedChange(
  supabase: SupabaseClient,
  roomId: string,
  projectId: string,
  data: {
    target_type: string;
    target_id?: string;
    change_type: string;
    field_name?: string;
    old_value?: unknown;
    new_value: unknown;
    summary: string;
  }
) {
  const { data: change, error } = await supabase
    .from("studio_proposed_changes")
    .insert({
      room_id: roomId,
      project_id: projectId,
      target_type: data.target_type,
      target_id: data.target_id || null,
      change_type: data.change_type,
      field_name: data.field_name || "",
      old_value: data.old_value ?? null,
      new_value: data.new_value,
      summary: data.summary.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return change as StudioProposedChange;
}

export async function acceptStudioProposedChange(
  supabase: SupabaseClient,
  changeId: string
) {
  const { data: change, error: fetchError } = await supabase
    .from("studio_proposed_changes")
    .select("*")
    .eq("id", changeId)
    .single();

  if (fetchError || !change) throw fetchError || new Error("Change not found");

  const c = change as StudioProposedChange;
  if (c.change_type === "update" && c.target_id) {
    const table = targetTypeToTable(c.target_type);
    if (table && c.field_name) {
      await supabase
        .from(table)
        .update({ [c.field_name]: c.new_value })
        .eq("id", c.target_id);
    }
  }

  const { data: updated, error } = await supabase
    .from("studio_proposed_changes")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", changeId)
    .select()
    .single();

  if (error) throw error;
  return updated as StudioProposedChange;
}

export async function rejectStudioProposedChange(
  supabase: SupabaseClient,
  changeId: string
) {
  const { data: updated, error } = await supabase
    .from("studio_proposed_changes")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("id", changeId)
    .select()
    .single();

  if (error) throw error;
  return updated as StudioProposedChange;
}
