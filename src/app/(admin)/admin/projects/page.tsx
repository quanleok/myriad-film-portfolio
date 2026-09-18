"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminProject {
  id: string;
  title: string;
  slug: string | null;
  genre: string | null;
  moderation_status: string;
  lifecycle_status: string;
  preorder_price_cents: number | null;
  unlock_target: number | null;
  preorder_count_cache: number;
  campaign_starts_at: string | null;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_username: string;
}

interface ProjectDetail {
  project: {
    id: string;
    title: string;
    slug: string | null;
    hook: string | null;
    synopsis: string | null;
    genre: string | null;
    tone: string | null;
    format: string | null;
    runtime_minutes: number | null;
    teaser_thumbnail_url: string | null;
    preorder_price_cents: number | null;
    release_price_cents: number | null;
    unlock_target: number | null;
    production_window_days: number | null;
    campaign_duration_days: number | null;
    campaign_starts_at: string | null;
    campaign_ends_at: string | null;
    delivery_deadline: string | null;
    lifecycle_status: string;
    moderation_status: string;
    preorder_count_cache: number;
    like_count_cache: number;
    discussion_count_cache: number;
    inspiration_line: string | null;
    content_rating: string | null;
    admin_rating_override: string | null;
    film_review_status: string | null;
    rights_attested_at: string | null;
    creator_terms_version: string | null;
    created_at: string;
    updated_at: string;
  };
  creator: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    strike_count: number;
    creator_good_standing: boolean;
    delivered_project_count: number;
    dispute_count: number;
    account_frozen: boolean;
  } | null;
  characters: { id: string; name: string; short_description: string | null; sort_order: number }[];
  concepts: { id: string; caption: string | null; sort_order: number }[];
  statusHistory: { from_status: string | null; to_status: string; reason: string | null; created_at: string }[];
  updates: {
    id: string;
    update_type: string;
    title: string | null;
    body: string | null;
    is_progress_proof: boolean;
    review_status: string | null;
    created_at: string;
  }[];
}

interface ProjectStats {
  totalProjects: number;
  lifecycleCounts: Record<string, number>;
  moderationCounts: Record<string, number>;
  totalPreorders: number;
  totalRevenueCents: number;
  pendingReview: number;
  flagged: number;
  suspended: number;
}

type FilterOption = "pending_review" | "live" | "flagged" | "suspended" | "rejected" | "all";

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  live: "bg-green-500/20 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/20 text-red-700 dark:text-red-400",
  flagged: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  suspended: "bg-red-500/20 text-red-700 dark:text-red-400",
  private_draft: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

const LIFECYCLE_STYLES: Record<string, string> = {
  draft: "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  unlocking: "border-white/30 bg-white/10 text-white/80 dark:text-white/70",
  in_production: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  premiering: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  released: "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400",
  failed_to_unlock: "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  cancelled: "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

const LIFECYCLE_LABELS: Record<string, string> = {
  draft: "Draft",
  unlocking: "Unlocking",
  in_production: "In Production",
  premiering: "Premiering",
  released: "Released",
  failed_to_unlock: "Did Not Unlock",
  cancelled: "Cancelled",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  live: "Live",
  rejected: "Rejected",
  flagged: "Flagged",
  suspended: "Suspended",
  private_draft: "Draft",
};

const FILTER_TABS: [FilterOption, string][] = [
  ["live", "Live"],
  ["pending_review", "Pending Review"],
  ["flagged", "Flagged"],
  ["suspended", "Suspended"],
  ["rejected", "Rejected"],
  ["all", "All"],
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("live");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{
    projectId: string;
    title: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Moderate modal (flag/suspend)
  const [moderateModal, setModerateModal] = useState<{
    projectId: string;
    title: string;
    action: "flag" | "suspend";
  } | null>(null);
  const [moderateReason, setModerateReason] = useState("");

  // Detail panel
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/projects/stats")
      .then((res) => res.json())
      .then((data) => { if (data.totalProjects !== undefined) setStats(data); })
      .catch(() => {});
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      const res = await fetch(`/api/admin/projects?${params}`);
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch detail when detailId changes
  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/admin/projects/${detailId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project) setDetail(data);
        else setDetail(null);
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  async function handleApprove(projectId: string) {
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to approve");
      }
    } catch {
      alert("Network error");
    }
    await fetchProjects();
    setActionLoading(null);
    // Refresh detail if open
    if (detailId === projectId) setDetailId(projectId);
  }

  async function handleReject(projectId: string, reason: string) {
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to reject");
      }
    } catch {
      alert("Network error");
    }
    setRejectModal(null);
    setRejectReason("");
    await fetchProjects();
    setActionLoading(null);
  }

  async function handleModerate(
    projectId: string,
    action: "flag" | "suspend" | "unflag" | "unsuspend",
    reason: string
  ) {
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to moderate");
      }
    } catch {
      alert("Network error");
    }
    setModerateModal(null);
    setModerateReason("");
    await fetchProjects();
    setActionLoading(null);
    // Refresh detail if open
    if (detailId === projectId) setDetailId(projectId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Projects</h1>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">Total Projects</p>
            <p className="text-xl font-bold text-text-primary">{stats.totalProjects}</p>
          </div>
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">Total Preorders</p>
            <p className="text-xl font-bold text-text-primary">{stats.totalPreorders.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">Preorder Revenue</p>
            <p className="text-xl font-bold text-text-primary">{formatCents(stats.totalRevenueCents)}</p>
          </div>
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">Pending Review</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.pendingReview}</p>
          </div>
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">Unlocking</p>
            <p className="text-lg font-semibold text-text-primary">{stats.lifecycleCounts["unlocking"] ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">In Production</p>
            <p className="text-lg font-semibold text-text-primary">{stats.lifecycleCounts["in_production"] ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">Flagged / Suspended</p>
            <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">
              {stats.flagged} / {stats.suspended}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-page-secondary p-3">
            <p className="text-xs text-text-tertiary">Released</p>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">{stats.lifecycleCounts["released"] ?? 0}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap rounded-lg border border-border overflow-hidden">
        {FILTER_TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 text-sm transition-colors ${
              filter === value
                ? "bg-surface text-text-primary font-medium"
                : "text-text-tertiary hover:text-text-primary hover:bg-surface/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={`overflow-x-auto rounded-xl border border-border ${detailId ? "flex-1 min-w-0" : "w-full"}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-page-secondary">
              <tr>
                <th className="px-4 py-3 text-text-secondary font-medium">
                  Project
                </th>
                <th className="px-4 py-3 text-text-secondary font-medium">
                  Creator
                </th>
                <th className="px-4 py-3 text-text-secondary font-medium text-right">
                  Preorders
                </th>
                <th className="px-4 py-3 text-text-secondary font-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-text-secondary font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-text-tertiary"
                  >
                    Loading...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-text-tertiary"
                  >
                    No projects found.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className={`transition-colors cursor-pointer ${
                      detailId === project.id
                        ? "bg-surface"
                        : "bg-page hover:bg-page-secondary"
                    }`}
                    onClick={() =>
                      setDetailId(detailId === project.id ? null : project.id)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-primary font-medium line-clamp-1 max-w-[200px]">
                          {project.title}
                        </span>
                        {project.campaign_starts_at &&
                          Date.now() - new Date(project.campaign_starts_at).getTime() < 24 * 60 * 60 * 1000 && (
                          <span className="inline-flex shrink-0 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary">
                        {project.genre ?? "No genre"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-sm">
                      {project.creator_name}
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">
                      {project.preorder_count_cache ?? 0}
                      {project.unlock_target
                        ? ` / ${project.unlock_target}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[project.moderation_status] ??
                            "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {STATUS_LABELS[project.moderation_status] ??
                            project.moderation_status}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            LIFECYCLE_STYLES[project.lifecycle_status] ??
                            "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {LIFECYCLE_LABELS[project.lifecycle_status] ??
                            project.lifecycle_status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {/* Approve/Reject for pending_review */}
                        {project.moderation_status === "pending_review" && (
                          <>
                            <button
                              onClick={() => handleApprove(project.id)}
                              disabled={actionLoading === project.id}
                              className="rounded px-2 py-1 text-xs text-green-700 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                            >
                              {actionLoading === project.id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() =>
                                setRejectModal({
                                  projectId: project.id,
                                  title: project.title,
                                })
                              }
                              disabled={actionLoading === project.id}
                              className="rounded px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {/* Flag/Suspend for live projects */}
                        {project.moderation_status === "live" && (
                          <>
                            <button
                              onClick={() =>
                                setModerateModal({
                                  projectId: project.id,
                                  title: project.title,
                                  action: "flag",
                                })
                              }
                              disabled={actionLoading === project.id}
                              className="rounded px-2 py-1 text-xs text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 disabled:opacity-50"
                            >
                              Flag
                            </button>
                            <button
                              onClick={() =>
                                setModerateModal({
                                  projectId: project.id,
                                  title: project.title,
                                  action: "suspend",
                                })
                              }
                              disabled={actionLoading === project.id}
                              className="rounded px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          </>
                        )}
                        {/* Unflag */}
                        {project.moderation_status === "flagged" && (
                          <button
                            onClick={() =>
                              handleModerate(project.id, "unflag", "")
                            }
                            disabled={actionLoading === project.id}
                            className="rounded px-2 py-1 text-xs text-green-700 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                          >
                            {actionLoading === project.id ? "..." : "Unflag"}
                          </button>
                        )}
                        {/* Unsuspend */}
                        {project.moderation_status === "suspended" && (
                          <button
                            onClick={() =>
                              handleModerate(project.id, "unsuspend", "")
                            }
                            disabled={actionLoading === project.id}
                            className="rounded px-2 py-1 text-xs text-green-700 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                          >
                            {actionLoading === project.id
                              ? "..."
                              : "Unsuspend"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {detailId && (
          <div className="w-[400px] shrink-0 rounded-xl border border-border bg-page-secondary overflow-y-auto max-h-[calc(100vh-200px)]">
            {detailLoading ? (
              <div className="p-6 text-center text-text-tertiary">
                Loading details...
              </div>
            ) : !detail ? (
              <div className="p-6 text-center text-text-tertiary">
                Failed to load project details.
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {detail.project.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[detail.project.moderation_status] ??
                          "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {STATUS_LABELS[detail.project.moderation_status] ??
                          detail.project.moderation_status}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          LIFECYCLE_STYLES[detail.project.lifecycle_status] ??
                          "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {LIFECYCLE_LABELS[detail.project.lifecycle_status] ??
                          detail.project.lifecycle_status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailId(null)}
                    className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-surface"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>

                {/* Teaser thumbnail */}
                {detail.project.teaser_thumbnail_url && (
                  <img
                    src={detail.project.teaser_thumbnail_url}
                    alt="Teaser"
                    className="w-full rounded-lg object-cover aspect-video"
                  />
                )}

                {/* Hook */}
                {detail.project.hook && (
                  <p className="text-sm text-text-secondary italic">
                    {detail.project.hook}
                  </p>
                )}

                {/* Synopsis */}
                {detail.project.synopsis && (
                  <div>
                    <h3 className="text-xs font-medium text-text-tertiary mb-1">
                      Synopsis
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {detail.project.synopsis}
                    </p>
                  </div>
                )}

                {/* Project info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-text-tertiary">Genre</p>
                    <p className="text-text-primary">
                      {detail.project.genre ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Format</p>
                    <p className="text-text-primary">
                      {detail.project.format ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Tone</p>
                    <p className="text-text-primary">
                      {detail.project.tone ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Runtime</p>
                    <p className="text-text-primary">
                      {detail.project.runtime_minutes
                        ? `${detail.project.runtime_minutes} min`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Preorder Price</p>
                    <p className="text-text-primary">
                      {detail.project.preorder_price_cents
                        ? formatCents(detail.project.preorder_price_cents)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Release Price</p>
                    <p className="text-text-primary">
                      {detail.project.release_price_cents
                        ? formatCents(detail.project.release_price_cents)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Preorders</p>
                    <p className="text-text-primary">
                      {detail.project.preorder_count_cache}
                      {detail.project.unlock_target
                        ? ` / ${detail.project.unlock_target}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Campaign</p>
                    <p className="text-text-primary">
                      {detail.project.campaign_duration_days
                        ? `${detail.project.campaign_duration_days} days`
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Compliance checks */}
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary mb-2">
                    Compliance
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          detail.project.rights_attested_at
                            ? "text-green-700 dark:text-green-400"
                            : "text-red-700 dark:text-red-400"
                        }
                      >
                        {detail.project.rights_attested_at ? "✓" : "✗"}
                      </span>
                      <span className="text-text-secondary">
                        Rights attested
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          detail.project.creator_terms_version
                            ? "text-green-700 dark:text-green-400"
                            : "text-red-700 dark:text-red-400"
                        }
                      >
                        {detail.project.creator_terms_version ? "✓" : "✗"}
                      </span>
                      <span className="text-text-secondary">
                        Creator terms accepted
                        {detail.project.creator_terms_version
                          ? ` (v${detail.project.creator_terms_version})`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Rating */}
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary mb-2">
                    Content Rating
                  </h3>
                  {(() => {
                    const effective = detail.project.admin_rating_override ?? detail.project.content_rating ?? "general";
                    const RATING_STYLES: Record<string, string> = {
                      general: "bg-green-500/20 text-green-700 dark:text-green-400",
                      teen: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
                      mature: "bg-red-500/20 text-red-700 dark:text-red-400",
                    };
                    const RATING_LABELS: Record<string, string> = {
                      general: "G",
                      teen: "PG-13",
                      mature: "R",
                    };
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RATING_STYLES[effective] ?? "bg-gray-500/20 text-gray-700 dark:text-gray-400"}`}>
                            {RATING_LABELS[effective] ?? effective}
                          </span>
                          {detail.project.admin_rating_override && (
                            <span className="text-xs text-text-tertiary">
                              (overridden from {RATING_LABELS[detail.project.content_rating ?? "general"] ?? detail.project.content_rating})
                            </span>
                          )}
                        </div>
                        {/* Override buttons — only show upgrade options */}
                        {effective !== "mature" && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-tertiary">Override to:</span>
                            {effective === "general" && (
                              <button
                                onClick={async () => {
                                  if (!confirm("Override content rating to Teen (13+)?")) return;
                                  try {
                                    const res = await fetch(`/api/admin/projects/${detail!.project.id}/moderate`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "override_rating", rating: "teen" }),
                                    });
                                    if (res.ok) setDetailId(detail!.project.id);
                                    else alert((await res.json()).error ?? "Failed");
                                  } catch { alert("Network error"); }
                                }}
                                className="rounded px-2 py-1 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                              >
                                Teen (13+)
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm("Override content rating to Mature (17+)?")) return;
                                try {
                                  const res = await fetch(`/api/admin/projects/${detail!.project.id}/moderate`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "override_rating", rating: "mature" }),
                                  });
                                  if (res.ok) setDetailId(detail!.project.id);
                                  else alert((await res.json()).error ?? "Failed");
                                } catch { alert("Network error"); }
                              }}
                              className="rounded px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/20"
                            >
                              Mature (17+)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Film Review (Quality Review Queue) */}
                {detail.project.film_review_status && (
                  <div>
                    <h3 className="text-xs font-medium text-text-tertiary mb-2">
                      Film Review
                    </h3>
                    <div className="space-y-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        detail.project.film_review_status === "approved"
                          ? "bg-green-500/20 text-green-700 dark:text-green-400"
                          : detail.project.film_review_status === "rejected"
                          ? "bg-red-500/20 text-red-700 dark:text-red-400"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      }`}>
                        {detail.project.film_review_status === "approved"
                          ? "Approved"
                          : detail.project.film_review_status === "rejected"
                          ? "Rejected"
                          : "Pending Review"}
                      </span>
                      {detail.project.film_review_status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!confirm("Approve this film for premiere?")) return;
                              try {
                                const res = await fetch(`/api/admin/projects/${detail!.project.id}/moderate`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "approve_film" }),
                                });
                                if (res.ok) setDetailId(detail!.project.id);
                                else alert((await res.json()).error ?? "Failed");
                              } catch { alert("Network error"); }
                            }}
                            className="rounded px-2 py-1 text-xs text-green-700 dark:text-green-400 hover:bg-green-500/20"
                          >
                            Approve Film
                          </button>
                          <button
                            onClick={async () => {
                              const note = prompt("Rejection reason:");
                              try {
                                const res = await fetch(`/api/admin/projects/${detail!.project.id}/moderate`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "reject_film", reason: note ?? "" }),
                                });
                                if (res.ok) setDetailId(detail!.project.id);
                                else alert((await res.json()).error ?? "Failed");
                              } catch { alert("Network error"); }
                            }}
                            className="rounded px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/20"
                          >
                            Reject Film
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Creator info */}
                {detail.creator && (
                  <div className="rounded-lg border border-border bg-page p-3">
                    <h3 className="text-xs font-medium text-text-tertiary mb-2">
                      Creator
                    </h3>
                    <div className="flex items-center gap-3">
                      {detail.creator.avatar_url ? (
                        <img
                          src={detail.creator.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-active flex items-center justify-center text-xs text-text-secondary">
                          {(detail.creator.display_name ?? "?")[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {detail.creator.display_name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          @{detail.creator.username ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-text-tertiary">Delivered</p>
                        <p className="text-text-primary">
                          {detail.creator.delivered_project_count ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-tertiary">Strikes</p>
                        <p
                          className={
                            detail.creator.strike_count > 0
                              ? "text-red-700 dark:text-red-400"
                              : "text-text-primary"
                          }
                        >
                          {detail.creator.strike_count ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-tertiary">Standing</p>
                        <p
                          className={
                            detail.creator.creator_good_standing
                              ? "text-green-700 dark:text-green-400"
                              : "text-red-700 dark:text-red-400"
                          }
                        >
                          {detail.creator.creator_good_standing
                            ? "Good"
                            : "Bad"}
                        </p>
                      </div>
                    </div>
                    {/* Project limits */}
                    <div className="mt-2 text-xs">
                      <p className="text-text-tertiary">Project Limit</p>
                      <p className="text-text-primary">
                        {(detail.creator.delivered_project_count ?? 0) >= 3
                          ? "Unlimited"
                          : (detail.creator.delivered_project_count ?? 0) >= 1
                          ? "3 active max"
                          : "1 active max (new creator)"}
                      </p>
                    </div>
                    {/* Dispute count & frozen status */}
                    {((detail.creator.dispute_count ?? 0) > 0 || detail.creator.account_frozen) && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {(detail.creator.dispute_count ?? 0) > 0 && (
                          <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                            (detail.creator.dispute_count ?? 0) >= 2
                              ? "bg-red-500/20 text-red-700 dark:text-red-400"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          }`}>
                            {detail.creator.dispute_count} dispute{(detail.creator.dispute_count ?? 0) !== 1 ? "s" : ""}
                          </span>
                        )}
                        {detail.creator.account_frozen && (
                          <span className="inline-flex rounded-full bg-red-500/20 px-2 py-0.5 font-medium text-red-700 dark:text-red-400">
                            Account Frozen
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Characters */}
                {detail.characters.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-text-tertiary mb-2">
                      Characters ({detail.characters.length})
                    </h3>
                    <div className="space-y-1">
                      {detail.characters.map((c) => (
                        <div
                          key={c.id}
                          className="text-sm text-text-secondary"
                        >
                          <span className="font-medium text-text-primary">
                            {c.name}
                          </span>
                          {c.short_description && (
                            <span> — {c.short_description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concepts */}
                {detail.concepts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-text-tertiary mb-2">
                      Concept Cards ({detail.concepts.length})
                    </h3>
                    <div className="space-y-1">
                      {detail.concepts.map((c) => (
                        <p
                          key={c.id}
                          className="text-sm text-text-secondary"
                        >
                          {c.caption ?? "No caption"}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Updates (progress proof review) */}
                {detail.updates.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-text-tertiary mb-2">
                      Updates ({detail.updates.length})
                    </h3>
                    <div className="space-y-2">
                      {detail.updates.map((u) => (
                        <div
                          key={u.id}
                          className="rounded-lg border border-border bg-page p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                              {u.update_type}
                            </span>
                            {u.is_progress_proof && (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  u.review_status === "approved"
                                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                    : u.review_status === "rejected"
                                    ? "bg-red-500/20 text-red-700 dark:text-red-400"
                                    : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                }`}
                              >
                                {u.review_status === "approved"
                                  ? "Approved"
                                  : u.review_status === "rejected"
                                  ? "Rejected"
                                  : "Pending Review"}
                              </span>
                            )}
                            <span className="ml-auto text-xs text-text-tertiary">
                              {new Date(u.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {u.title && (
                            <p className="text-sm font-medium text-text-primary">
                              {u.title}
                            </p>
                          )}
                          {u.body && (
                            <p className="text-xs text-text-secondary mt-1 line-clamp-3">
                              {u.body}
                            </p>
                          )}
                          {u.is_progress_proof &&
                            u.review_status === "pending" && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(
                                        `/api/projects/${detail!.project.id}/updates/${u.id}/approve`,
                                        { method: "POST" }
                                      );
                                      if (res.ok) {
                                        setDetailId(detail!.project.id);
                                      } else {
                                        const data = await res.json();
                                        alert(
                                          data.error ?? "Failed to approve"
                                        );
                                      }
                                    } catch {
                                      alert("Network error");
                                    }
                                  }}
                                  className="rounded px-2 py-1 text-xs text-green-700 dark:text-green-400 hover:bg-green-500/20"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    const note = prompt(
                                      "Rejection note (optional):"
                                    );
                                    try {
                                      const res = await fetch(
                                        `/api/projects/${detail!.project.id}/updates/${u.id}/approve`,
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            rejected: true,
                                            note: note ?? undefined,
                                          }),
                                        }
                                      );
                                      if (res.ok) {
                                        setDetailId(detail!.project.id);
                                      } else {
                                        const data = await res.json();
                                        alert(
                                          data.error ?? "Failed to reject"
                                        );
                                      }
                                    } catch {
                                      alert("Network error");
                                    }
                                  }}
                                  className="rounded px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/20"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status history */}
                {detail.statusHistory.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-text-tertiary mb-2">
                      Status History
                    </h3>
                    <div className="space-y-1">
                      {detail.statusHistory.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="text-text-tertiary">
                            {new Date(h.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-text-secondary">
                            {h.from_status ?? "—"} → {h.to_status}
                          </span>
                          {h.reason && (
                            <span className="text-text-tertiary truncate">
                              ({h.reason})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View on site link */}
                {detail.project.slug && (
                  <a
                    href={`/project/${detail.project.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
                  >
                    View on site
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" x2="21" y1="14" y2="3" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-page-secondary p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">
              Reject &ldquo;{rejectModal.title}&rdquo;
            </h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional, visible to creator)"
              className="w-full rounded-lg border border-border bg-page px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleReject(rejectModal.projectId, rejectReason)
                }
                disabled={actionLoading === rejectModal.projectId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderate modal (flag/suspend) */}
      {moderateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-page-secondary p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">
              {moderateModal.action === "flag" ? "Flag" : "Suspend"}{" "}
              &ldquo;{moderateModal.title}&rdquo;
            </h2>
            <p className="text-sm text-text-secondary">
              {moderateModal.action === "flag"
                ? "Flagging marks this project for follow-up. It remains visible but is flagged in the admin panel."
                : "Suspending hides this project from public view. The creator will be notified."}
            </p>
            <textarea
              value={moderateReason}
              onChange={(e) => setModerateReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full rounded-lg border border-border bg-page px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setModerateModal(null);
                  setModerateReason("");
                }}
                className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleModerate(
                    moderateModal.projectId,
                    moderateModal.action,
                    moderateReason
                  )
                }
                disabled={actionLoading === moderateModal.projectId}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  moderateModal.action === "flag"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {moderateModal.action === "flag"
                  ? "Flag Project"
                  : "Suspend Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
