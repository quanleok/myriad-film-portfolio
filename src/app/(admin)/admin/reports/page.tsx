"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  video_id: string | null;
  comment_id: string | null;
  project_id: string | null;
  reporter: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  } | null;
  comment: {
    id: string;
    body: string;
    video_id: string;
  } | null;
}

type FilterOption = "pending" | "copyright_claims" | "reviewed" | "dismissed" | "all";

const REASON_LABELS: Record<string, string> = {
  copyright: "Copyright",
  copyright_claim: "Copyright Claim",
  inappropriate: "Inappropriate",
  spam: "Spam",
  harassment: "Harassment",
  other: "Other",
};

const REASON_STYLES: Record<string, string> = {
  copyright_claim: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ filter });

    const res = await fetch(`/api/admin/reports?${params}`);
    const data = await res.json();
    setReports(data.reports ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleAction(
    action: "review" | "dismiss" | "remove_content",
    reportId: string
  ) {
    setActionLoading(reportId);
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reportId }),
    });
    await fetchReports();
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Content Reports</h1>

      {/* Filter tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {(["pending", "copyright_claims", "reviewed", "dismissed", "all"] as FilterOption[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm transition-colors ${
                filter === f
                  ? "bg-surface text-text-primary"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {f === "copyright_claims" ? "Copyright Claims" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-page-secondary">
            <tr>
              <th className="px-4 py-3 text-text-secondary font-medium">
                Reported Item
              </th>
              <th className="px-4 py-3 text-text-secondary font-medium">Reporter</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Reason</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Date</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Status</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-tertiary">
                  Loading...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-tertiary">
                  No reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report.id}
                  className="bg-page hover:bg-page-secondary transition-colors"
                >
                  <td className="px-4 py-3">
                    {report.video ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-14 shrink-0 overflow-hidden rounded bg-surface">
                          {report.video.thumbnail_url ? (
                            <img
                              src={report.video.thumbnail_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-text-tertiary">
                              Video
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/watch/${report.video.id}`}
                            className="text-text-primary hover:text-brand-400 line-clamp-1"
                            target="_blank"
                          >
                            {report.video.title}
                          </Link>
                          <p className="text-[10px] text-text-tertiary">Video</p>
                        </div>
                      </div>
                    ) : report.comment ? (
                      <div>
                        <p className="text-text-primary line-clamp-1 max-w-[250px]">
                          &ldquo;{report.comment.body}&rdquo;
                        </p>
                        <p className="text-[10px] text-text-tertiary">Comment</p>
                      </div>
                    ) : (
                      <span className="text-text-tertiary">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {report.reporter ? (
                      <span className="text-text-primary">
                        {report.reporter.display_name}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${REASON_STYLES[report.reason] ?? "bg-surface text-text-primary"}`}>
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    {report.details && (
                      <p className="mt-1 text-[10px] text-text-tertiary line-clamp-1 max-w-[150px]">
                        {report.details}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-tertiary">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.status === "pending"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : report.status === "reviewed"
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-surface-hover text-text-secondary"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {report.status === "pending" ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAction("review", report.id)}
                          disabled={actionLoading === report.id}
                          className="rounded px-2 py-1 text-xs text-green-700 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                        >
                          Review
                        </button>
                        <button
                          onClick={() =>
                            handleAction("remove_content", report.id)
                          }
                          disabled={actionLoading === report.id}
                          className="rounded px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => handleAction("dismiss", report.id)}
                          disabled={actionLoading === report.id}
                          className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">
                        {report.reviewed_at
                          ? new Date(report.reviewed_at).toLocaleDateString()
                          : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
