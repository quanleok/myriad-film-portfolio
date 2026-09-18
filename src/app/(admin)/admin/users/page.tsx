"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface AdminUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_creator: boolean;
  is_banned: boolean;
  is_admin: boolean;
  created_at: string;
  video_count: number;
  dispute_count: number;
  account_frozen: boolean;
}

type FilterOption = "all" | "creators" | "banned" | "frozen";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ filter });
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAction(action: "ban" | "unban" | "freeze" | "unfreeze" | "soft_delete", userId: string) {
    let body: Record<string, string> = { action, userId };
    if (action === "soft_delete") {
      const reason = prompt("Reason for account deletion (optional):");
      if (reason === null) return; // cancelled
      body = { action, userId, reason: reason || "" };
    }
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Action failed");
      }
    } catch {
      alert("Network error");
    }
    await fetchUsers();
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Users</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or username..."
          className="rounded-lg border border-border bg-page-secondary px-4 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
        />
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "creators", "banned", "frozen"] as FilterOption[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm capitalize transition-colors ${
                filter === f
                  ? "bg-surface text-text-primary"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-page-secondary">
            <tr>
              <th className="px-4 py-3 text-text-secondary font-medium">User</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Joined</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Role</th>
              <th className="px-4 py-3 text-text-secondary font-medium text-right">Videos</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-tertiary">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="bg-page hover:bg-page-secondary transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-surface-active">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">
                            {u.display_name[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{u.display_name}</p>
                        <p className="text-xs text-text-tertiary">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-tertiary">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary">
                      {u.is_admin ? "Admin" : u.is_creator ? "Creator" : "Viewer"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">
                    {u.video_count}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_banned
                            ? "bg-red-500/20 text-red-700 dark:text-red-400"
                            : "bg-green-500/20 text-green-700 dark:text-green-400"
                        }`}
                      >
                        {u.is_banned ? "Banned" : "Active"}
                      </span>
                      {u.account_frozen && (
                        <span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                          Frozen
                        </span>
                      )}
                      {(u.dispute_count ?? 0) > 0 && (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.dispute_count >= 2
                            ? "bg-red-500/20 text-red-700 dark:text-red-400"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}>
                          {u.dispute_count} dispute{u.dispute_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/creator/${u.username}`}
                        className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        target="_blank"
                      >
                        Profile
                      </Link>
                      {!u.is_admin && (
                        <>
                          <button
                            onClick={() =>
                              handleAction(
                                u.is_banned ? "unban" : "ban",
                                u.id
                              )
                            }
                            disabled={actionLoading === u.id}
                            className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${
                              u.is_banned
                                ? "text-green-700 dark:text-green-400 hover:bg-green-500/20"
                                : "text-red-700 dark:text-red-400 hover:bg-red-500/20"
                            }`}
                          >
                            {actionLoading === u.id
                              ? "..."
                              : u.is_banned
                                ? "Unban"
                                : "Ban"}
                          </button>
                          <button
                            onClick={() =>
                              handleAction(
                                u.account_frozen ? "unfreeze" : "freeze",
                                u.id
                              )
                            }
                            disabled={actionLoading === u.id}
                            className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${
                              u.account_frozen
                                ? "text-green-700 dark:text-green-400 hover:bg-green-500/20"
                                : "text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                            }`}
                          >
                            {u.account_frozen ? "Unfreeze" : "Freeze"}
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`Delete account for ${u.display_name}? This will cancel all active projects and refund preorders. Released content stays up.`)) return;
                              handleAction("soft_delete", u.id);
                            }}
                            disabled={actionLoading === u.id}
                            className="rounded px-2 py-1 text-xs text-red-700 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
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
