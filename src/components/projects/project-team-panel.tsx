"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ProjectCollaboratorInviteStatus,
  ProjectCollaboratorRole,
} from "@/types/project";

interface TeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectCollaboratorRole;
  invite_status: ProjectCollaboratorInviteStatus;
  can_view_earnings: boolean;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface TeamResponse {
  collaborators: TeamMember[];
  collaboratorCap: number;
  canManage: boolean;
}

interface ProjectTeamPanelProps {
  projectId: string;
  isOwner: boolean;
}

export function ProjectTeamPanel({
  projectId,
  isOwner,
}: ProjectTeamPanelProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [collaboratorCap, setCollaboratorCap] = useState(2);
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [inviteCanViewEarnings, setInviteCanViewEarnings] = useState(false);
  const [memberDrafts, setMemberDrafts] = useState<
    Record<string, { role: "editor" | "viewer"; canViewEarnings: boolean }>
  >({});

  const activeCollaboratorCount = useMemo(
    () =>
      team.filter(
        (member) =>
          member.role !== "owner" &&
          (member.invite_status === "pending" ||
            member.invite_status === "accepted")
      ).length,
    [team]
  );

  async function loadTeam() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/team`);
      const payload = (await response.json().catch(() => ({}))) as
        | TeamResponse
        | { error?: string };
      if (!response.ok || !("collaborators" in payload)) {
        throw new Error(
          "error" in payload ? payload.error ?? "Failed to load team" : "Failed to load team"
        );
      }

      setTeam(payload.collaborators);
      setCollaboratorCap(payload.collaboratorCap);
      setMemberDrafts(
        Object.fromEntries(
          payload.collaborators
            .filter((member) => member.role !== "owner")
            .map((member) => [
              member.id,
              {
                role: member.role === "editor" ? "editor" : "viewer",
                canViewEarnings: member.can_view_earnings,
              },
            ])
        )
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, [projectId]);

  async function inviteCollaborator() {
    setPendingKey("invite");
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: inviteUsername,
          role: inviteRole,
          can_view_earnings: inviteCanViewEarnings,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send invite");
      }
      setInviteUsername("");
      setInviteRole("viewer");
      setInviteCanViewEarnings(false);
      await loadTeam();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to invite collaborator");
    } finally {
      setPendingKey(null);
    }
  }

  async function saveMember(memberId: string) {
    const draft = memberDrafts[memberId];
    if (!draft) return;

    setPendingKey(`save-${memberId}`);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/team/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: draft.role,
            can_view_earnings: draft.canViewEarnings,
          }),
        }
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update collaborator");
      }
      await loadTeam();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update collaborator");
    } finally {
      setPendingKey(null);
    }
  }

  async function removeMember(memberId: string) {
    setPendingKey(`remove-${memberId}`);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/team/${memberId}`,
        { method: "DELETE" }
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove collaborator");
      }
      await loadTeam();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to remove collaborator");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-brand-500" />
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Team
            </h2>
          </div>
          <p className="text-xs text-text-tertiary">
            {activeCollaboratorCount} / {collaboratorCap} collaborator slots used
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-sm text-role-danger-fg">
            {errorMessage}
          </div>
        ) : null}

        {isOwner ? (
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="grid gap-3 md:grid-cols-[1.6fr,1fr,auto]">
              <Input
                label="Invite by username"
                placeholder="@username"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
              />
              <label className="space-y-1.5 text-sm">
                <span className="block font-medium text-text-primary">Role</span>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value === "editor" ? "editor" : "viewer")
                  }
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button
                  className="w-full md:w-auto"
                  onClick={() => void inviteCollaborator()}
                  disabled={
                    pendingKey === "invite" ||
                    activeCollaboratorCount >= collaboratorCap ||
                    inviteUsername.trim().length === 0
                  }
                >
                  {pendingKey === "invite" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  Send Invite
                </Button>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={inviteCanViewEarnings}
                onChange={(e) => setInviteCanViewEarnings(e.target.checked)}
              />
              Allow this collaborator to view project earnings
            </label>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 size={14} className="animate-spin" />
            Loading team…
          </div>
        ) : team.length === 0 ? (
          <p className="text-sm text-text-tertiary">No team members yet.</p>
        ) : (
          <div className="space-y-3">
            {team.map((member) => {
              const profileName =
                member.profiles?.display_name ||
                member.profiles?.username ||
                "Unknown user";
              const draft = memberDrafts[member.id] ?? {
                role: member.role === "editor" ? "editor" : "viewer",
                canViewEarnings: member.can_view_earnings,
              };

              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-text-primary">{profileName}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
                        <span className="rounded-full bg-surface-secondary px-2 py-0.5">
                          {member.role}
                        </span>
                        <span className="rounded-full bg-surface-secondary px-2 py-0.5">
                          {member.invite_status}
                        </span>
                        {member.can_view_earnings ? (
                          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-brand-500">
                            Earnings access
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isOwner && member.role !== "owner" ? (
                      <div className="grid gap-2 sm:grid-cols-[1fr,auto,auto] sm:items-center">
                        <select
                          value={draft.role}
                          onChange={(e) =>
                            setMemberDrafts((current) => ({
                              ...current,
                              [member.id]: {
                                ...draft,
                                role:
                                  e.target.value === "editor" ? "editor" : "viewer",
                              },
                            }))
                          }
                          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary outline-none"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>

                        <label className="flex items-center gap-2 text-sm text-text-secondary">
                          <input
                            type="checkbox"
                            checked={draft.canViewEarnings}
                            onChange={(e) =>
                              setMemberDrafts((current) => ({
                                ...current,
                                [member.id]: {
                                  ...draft,
                                  canViewEarnings: e.target.checked,
                                },
                              }))
                            }
                          />
                          Earnings
                        </label>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void saveMember(member.id)}
                            disabled={pendingKey === `save-${member.id}`}
                          >
                            {pendingKey === `save-${member.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : null}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void removeMember(member.id)}
                            disabled={pendingKey === `remove-${member.id}`}
                          >
                            {pendingKey === `remove-${member.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
