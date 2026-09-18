"use client";

import Link from "next/link";
import { ArrowLeft, Eye, MessageSquare, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { LifecycleBadge } from "./lifecycle-badge";
import { ProjectTeamPanel } from "./project-team-panel";
import type {
  DashboardDiscussionStats,
  DashboardPremiere,
  DashboardProject,
  DashboardUpdate,
} from "./project-dashboard";

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

interface DashboardCollaboratorDetailProps {
  project: DashboardProject;
  recentUpdates: DashboardUpdate[];
  discussion: DashboardDiscussionStats;
  premiere: DashboardPremiere | null;
  preordersToday: number;
  preordersThisWeek: number;
  onBack: () => void;
}

export function DashboardCollaboratorDetail({
  project,
  recentUpdates,
  discussion,
  premiere,
  preordersToday,
  preordersThisWeek,
  onBack,
}: DashboardCollaboratorDetailProps) {
  const feePercent = Math.round(project.platform_fee_rate * 100);
  const creatorShareCents = Math.round(
    project.ledger_revenue_cents * (1 - project.platform_fee_rate)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        All Projects
      </button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-text-primary">
              {project.title}
            </h1>
            <LifecycleBadge status={project.lifecycle_status} />
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-text-secondary">
              {project.access_role}
            </span>
            {project.can_view_earnings ? (
              <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs text-brand-500">
                Earnings access
              </span>
            ) : null}
          </div>

          <div className="grid gap-2 text-xs text-text-tertiary sm:grid-cols-3">
            <p>Campaign deadline: {formatDate(project.campaign_ends_at)}</p>
            <p>Delivery deadline: {formatDate(project.delivery_deadline)}</p>
            <p>Premiere date: {formatDate(premiere?.premiere_scheduled_at ?? null)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/project/${project.slug ?? project.id}`}>
              <Button>View Project Page</Button>
            </Link>
            {project.film_video_id ? (
              <Link href={`/watch/${project.film_video_id}`}>
                <Button variant="secondary">
                  <PlayCircle size={14} />
                  Watch Page
                </Button>
              </Link>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {project.can_view_earnings ? (
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Project Earnings
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-text-secondary">Gross revenue</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {formatPrice(project.ledger_revenue_cents)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-text-secondary">
                  Creator share ({100 - feePercent}%)
                </p>
                <p className="mt-1 text-xl font-semibold text-role-success-fg">
                  {formatPrice(creatorShareCents)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-text-secondary">Preorders today</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {preordersToday}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-text-secondary">Preorders this week</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {preordersThisWeek}
                </p>
              </div>
            </div>
            <p className="text-xs text-text-tertiary">
              Revenue is visible here for collaboration purposes only. Payouts are still handled by
              the project owner.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-text-secondary">
            You can review this project, but earnings visibility has not been enabled for your seat.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Updates
            </h2>
          </CardHeader>
          <CardContent>
            {recentUpdates.length === 0 ? (
              <p className="text-sm text-text-tertiary">No updates posted yet.</p>
            ) : (
              <div className="space-y-2">
                {recentUpdates.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <p className="font-medium text-text-primary">
                      {item.title || "Untitled update"}
                    </p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {item.update_type} · {formatDate(item.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Discussion
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary">
              <p>Total posts: {discussion.totalPosts}</p>
              <p>New this week: {discussion.newThisWeek}</p>
              <p>Unanswered: {discussion.unanswered}</p>
            </div>
            <Link href={`/project/${project.slug ?? project.id}?tab=discussion`}>
              <Button variant="secondary">
                <MessageSquare size={14} />
                Open Discussion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Premiere
            </h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-text-secondary">
            {premiere?.is_premiere_live ? (
              <div className="rounded-lg border border-role-success-border bg-role-success-bg p-3 text-role-success-fg">
                Live now
              </div>
            ) : null}
            <p>Scheduled: {formatDate(premiere?.premiere_scheduled_at ?? null)}</p>
            <p>Status: {project.lifecycle_status}</p>
            {project.film_video_id ? (
              <Link href={`/watch/${project.film_video_id}`}>
                <Button variant="secondary">
                  <Eye size={14} />
                  Open Watch Page
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <ProjectTeamPanel projectId={project.id} isOwner={false} />
      </div>
    </div>
  );
}
