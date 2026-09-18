import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ProjectCollaboratorInviteStatus,
  ProjectCollaboratorRole,
} from "@/types/project";

export const MAX_PROJECT_COLLABORATORS = 2;

export interface ProjectAccessContext {
  projectId: string;
  userId: string;
  creatorId: string;
  isOwner: boolean;
  role: ProjectCollaboratorRole | null;
  inviteStatus: ProjectCollaboratorInviteStatus | null;
  canViewEarnings: boolean;
}

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectCollaboratorRole;
  invite_status: ProjectCollaboratorInviteStatus;
  can_view_earnings: boolean;
  created_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

function normalizeProfile(
  profile: unknown
): ProjectTeamMember["profiles"] {
  if (!profile || typeof profile !== "object") return null;
  const record = profile as Record<string, unknown>;
  return {
    display_name:
      typeof record.display_name === "string" ? record.display_name : null,
    username: typeof record.username === "string" ? record.username : null,
    avatar_url:
      typeof record.avatar_url === "string" ? record.avatar_url : null,
  };
}

export function canReadPrivateProject(
  access: ProjectAccessContext | null
): boolean {
  return Boolean(access && (access.isOwner || access.inviteStatus === "accepted"));
}

export function canManageProjectTeam(
  access: ProjectAccessContext | null
): boolean {
  return Boolean(access?.isOwner);
}

export function canViewProjectEarnings(
  access: ProjectAccessContext | null
): boolean {
  return Boolean(access && (access.isOwner || access.canViewEarnings));
}

export async function getProjectAccessContext(
  projectId: string,
  userId: string
): Promise<ProjectAccessContext | null> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, creator_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return null;

  if (project.creator_id === userId) {
    return {
      projectId: project.id,
      userId,
      creatorId: project.creator_id,
      isOwner: true,
      role: "owner",
      inviteStatus: "accepted",
      canViewEarnings: true,
    };
  }

  const { data: collaborator } = await admin
    .from("project_collaborators")
    .select("role, invite_status, can_view_earnings")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!collaborator) {
    return null;
  }

  return {
    projectId: project.id,
    userId,
    creatorId: project.creator_id,
    isOwner: false,
    role: collaborator.role as ProjectCollaboratorRole,
    inviteStatus: collaborator.invite_status as ProjectCollaboratorInviteStatus,
    canViewEarnings: Boolean(collaborator.can_view_earnings),
  };
}

export async function countActiveProjectCollaborators(
  projectId: string
): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("project_collaborators")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .neq("role", "owner")
    .in("invite_status", ["pending", "accepted"]);

  return count ?? 0;
}

export async function getProjectTeamMembers(
  projectId: string
): Promise<ProjectTeamMember[]> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select(
      "id, creator_id, profiles:creator_id(display_name, username, avatar_url)"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return [];

  const { data: collaborators } = await admin
    .from("project_collaborators")
    .select(
      "id, project_id, user_id, role, invite_status, can_view_earnings, created_at, accepted_at, revoked_at, profiles:user_id(display_name, username, avatar_url)"
    )
    .eq("project_id", projectId)
    .neq("role", "owner")
    .in("invite_status", ["pending", "accepted"])
    .order("created_at", { ascending: true });

  const ownerMember: ProjectTeamMember = {
    id: `owner-${project.id}`,
    project_id: project.id,
    user_id: project.creator_id,
    role: "owner",
    invite_status: "accepted",
    can_view_earnings: true,
    created_at: null,
    accepted_at: null,
    revoked_at: null,
    profiles: normalizeProfile(project.profiles),
  };

  const collaboratorMembers = (collaborators ?? []).map((row) => ({
    id: row.id,
    project_id: row.project_id,
    user_id: row.user_id,
    role: row.role as ProjectCollaboratorRole,
    invite_status: row.invite_status as ProjectCollaboratorInviteStatus,
    can_view_earnings: Boolean(row.can_view_earnings),
    created_at: row.created_at ?? null,
    accepted_at: row.accepted_at ?? null,
    revoked_at: row.revoked_at ?? null,
    profiles: normalizeProfile(row.profiles),
  }));

  return [ownerMember, ...collaboratorMembers];
}
