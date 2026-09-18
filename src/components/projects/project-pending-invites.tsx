"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type {
  ProjectCollaboratorRole,
} from "@/types/project";

export interface DashboardPendingInvite {
  id: string;
  project_id: string;
  project_title: string;
  owner_display_name: string | null;
  owner_username: string | null;
  role: ProjectCollaboratorRole;
  can_view_earnings: boolean;
  created_at: string;
}

interface ProjectPendingInvitesProps {
  invites: DashboardPendingInvite[];
}

export function ProjectPendingInvites({
  invites,
}: ProjectPendingInvitesProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (invites.length === 0) return null;

  async function respond(
    invite: DashboardPendingInvite,
    action: "accept" | "decline"
  ) {
    setPendingKey(`${action}-${invite.id}`);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/projects/${invite.project_id}/team/invites/${invite.id}/${action}`,
        { method: "POST" }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? `Could not ${action} invite`);
      }
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Invite action failed");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card className="mb-6 border-brand-500/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus size={16} className="text-brand-500" />
          <h2 className="font-display text-base font-semibold text-text-primary">
            Pending Project Invites
          </h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errorMessage ? (
          <div className="rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-sm text-role-danger-fg">
            {errorMessage}
          </div>
        ) : null}

        {invites.map((invite) => {
          const ownerName =
            invite.owner_display_name || invite.owner_username || "Project owner";
          const acceptKey = `accept-${invite.id}`;
          const declineKey = `decline-${invite.id}`;

          return (
            <div
              key={invite.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-text-primary">{invite.project_title}</p>
                  <p className="text-sm text-text-secondary">
                    Invited by {ownerName} as{" "}
                    <span className="font-medium text-text-primary">
                      {invite.role}
                    </span>
                  </p>
                  {invite.can_view_earnings ? (
                    <p className="text-xs text-brand-500">
                      This invite includes project earnings visibility.
                    </p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void respond(invite, "accept")}
                    disabled={pendingKey === acceptKey || pendingKey === declineKey}
                  >
                    {pendingKey === acceptKey ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void respond(invite, "decline")}
                    disabled={pendingKey === acceptKey || pendingKey === declineKey}
                  >
                    {pendingKey === declineKey ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
