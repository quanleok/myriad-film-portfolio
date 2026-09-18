"use client";

import { useState, useEffect } from "react";

interface ProjectUpdate {
  id: string;
  project_id: string;
  creator_id: string;
  update_type: "text" | "image" | "video" | "progress_proof";
  title: string | null;
  body: string | null;
  media_asset_id: string | null;
  is_progress_proof: boolean;
  review_status: "pending" | "approved" | "rejected" | null;
  created_at: string;
  updated_at: string;
}

const UPDATE_TYPE_LABELS: Record<string, string> = {
  text: "Update",
  image: "Image",
  video: "Video",
  progress_proof: "Progress Proof",
};

const UPDATE_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  image: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  video: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  progress_proof: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function ProjectUpdates({ projectId }: { projectId: string }) {
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUpdates() {
      try {
        const res = await fetch(`/api/projects/${projectId}/updates`);
        if (!res.ok) {
          setError("Failed to load updates");
          return;
        }
        const data = await res.json();
        setUpdates(data.updates ?? []);
      } catch {
        setError("Failed to load updates");
      } finally {
        setLoading(false);
      }
    }
    fetchUpdates();
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-surface"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-text-secondary">
        No updates yet. Check back later for production updates from the creator.
      </p>
    );
  }

  if (updates.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No updates yet. Check back later for production updates from the creator.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <div
          key={update.id}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                UPDATE_TYPE_COLORS[update.update_type] ?? "bg-gray-500/15 text-gray-700 dark:text-gray-400"
              }`}
            >
              {UPDATE_TYPE_LABELS[update.update_type] ?? update.update_type}
            </span>
            {update.is_progress_proof && update.review_status === "approved" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Verified
              </span>
            )}
            <span className="ml-auto text-xs text-text-tertiary">
              {timeAgo(update.created_at)}
            </span>
          </div>
          {update.title && (
            <h4 className="mb-1 text-sm font-semibold">{update.title}</h4>
          )}
          {update.body && (
            <p className="text-sm text-text-secondary whitespace-pre-line">
              {update.body}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
