"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ProjectSafetyItem {
  id: string;
  title: string;
  slug: string | null;
  creator_id: string;
  delivery_deadline?: string | null;
  grace_period_end?: string | null;
  is_overdue?: boolean;
  preorder_count_cache?: number;
  unlock_target?: number | null;
  campaign_ends_at?: string | null;
  profiles: { display_name: string | null; username: string | null } | null;
}

interface FilmReviewItem {
  id: string;
  title: string;
  slug: string | null;
  creator_id: string;
  film_review_status: string | null;
  profiles: { display_name: string | null; username: string | null; delivered_project_count: number } | null;
}

interface DashboardStats {
  totalUsers: number;
  totalCreators: number;
  totalVideos: number;
  totalRevenueCents: number;
  monthRevenueCents: number;
  newUsersThisWeek: number;
  newVideosThisWeek: number;
  activeUsersThisWeek: number;
  pendingReports: number;
  dailyUsers: { date: string; count: number }[];
  dailyVideos: { date: string; count: number }[];
  greenlightQueue: ProjectSafetyItem[];
  greenlightQueueCount: number;
  approachingDeadlines: ProjectSafetyItem[];
  approachingDeadlineCount: number;
  overdueProjects: ProjectSafetyItem[];
  overdueProjectCount: number;
  filmReviewQueue: FilmReviewItem[];
  filmReviewQueueCount: number;
}

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-page-secondary p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
      {subValue && (
        <p className="mt-1 text-xs text-text-tertiary">{subValue}</p>
      )}
    </div>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-page-secondary"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-20 text-center text-text-tertiary">
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
        />
        <StatCard
          label="Total Creators"
          value={stats.totalCreators.toLocaleString()}
        />
        <StatCard
          label="Total Videos"
          value={stats.totalVideos.toLocaleString()}
        />
        <StatCard
          label="Total Revenue"
          value={formatCents(stats.totalRevenueCents)}
          subValue={`${formatCents(stats.monthRevenueCents)} this month`}
        />
        <StatCard
          label="New Users (7d)"
          value={stats.newUsersThisWeek.toLocaleString()}
        />
        <StatCard
          label="New Videos (7d)"
          value={stats.newVideosThisWeek.toLocaleString()}
        />
        <StatCard
          label="Active Users (7d)"
          value={stats.activeUsersThisWeek.toLocaleString()}
        />
        <StatCard
          label="Pending Reports"
          value={stats.pendingReports.toLocaleString()}
        />
      </div>

      {/* Project Safety */}
      {(stats.greenlightQueueCount > 0 || stats.overdueProjectCount > 0 || stats.approachingDeadlineCount > 0) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Project Safety</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StatCard
              label="Greenlight Queue"
              value={stats.greenlightQueueCount.toLocaleString()}
              subValue="Projects eligible for manual greenlight"
            />
            <StatCard
              label="Approaching Deadlines"
              value={stats.approachingDeadlineCount.toLocaleString()}
              subValue="Due within 3 days"
            />
            <StatCard
              label="Overdue Projects"
              value={stats.overdueProjectCount.toLocaleString()}
              subValue="Past grace period"
            />
          </div>
        </div>
      )}

      {/* Greenlight Queue */}
      {stats.greenlightQueue.length > 0 && (
        <div className="rounded-xl border border-border bg-page-secondary p-5">
          <h2 className="mb-3 text-sm font-medium text-text-secondary">
            Greenlight Queue
          </h2>
          <div className="space-y-2">
            {stats.greenlightQueue.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border bg-page-primary px-4 py-3"
              >
                <div>
                  <p className="font-medium text-text-primary">{p.title}</p>
                  <p className="text-xs text-text-tertiary">
                    by {p.profiles?.display_name ?? p.profiles?.username ?? "Unknown"}
                    {" — "}
                    {p.preorder_count_cache ?? 0}/{p.unlock_target ?? "?"} preorders
                  </p>
                </div>
                {p.campaign_ends_at && (
                  <p className="text-xs text-text-tertiary">
                    Ends {new Date(p.campaign_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approaching Deadlines */}
      {stats.approachingDeadlines.length > 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-page-secondary p-5">
          <h2 className="mb-3 text-sm font-medium text-yellow-700 dark:text-yellow-400">
            Approaching Deadlines
          </h2>
          <div className="space-y-2">
            {stats.approachingDeadlines.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border bg-page-primary px-4 py-3"
              >
                <div>
                  <p className="font-medium text-text-primary">{p.title}</p>
                  <p className="text-xs text-text-tertiary">
                    by {p.profiles?.display_name ?? p.profiles?.username ?? "Unknown"}
                  </p>
                </div>
                {p.delivery_deadline && (
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Due {new Date(p.delivery_deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Projects */}
      {stats.overdueProjects.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-page-secondary p-5">
          <h2 className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">
            Overdue Projects
          </h2>
          <div className="space-y-2">
            {stats.overdueProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border bg-page-primary px-4 py-3"
              >
                <div>
                  <p className="font-medium text-text-primary">{p.title}</p>
                  <p className="text-xs text-text-tertiary">
                    by {p.profiles?.display_name ?? p.profiles?.username ?? "Unknown"}
                  </p>
                </div>
                <div className="text-right">
                  {p.delivery_deadline && (
                    <p className="text-xs text-red-700 dark:text-red-400">
                      Was due {new Date(p.delivery_deadline).toLocaleDateString()}
                    </p>
                  )}
                  {p.grace_period_end && (
                    <p className="text-xs text-text-tertiary">
                      Grace ends {new Date(p.grace_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Film Review Queue */}
      {stats.filmReviewQueue.length > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-page-secondary p-5">
          <h2 className="mb-3 text-sm font-medium text-purple-700 dark:text-purple-400">
            Film Review Queue ({stats.filmReviewQueueCount})
          </h2>
          <p className="mb-3 text-xs text-text-tertiary">
            First-time creator uploads requiring manual review before premiere.
          </p>
          <div className="space-y-2">
            {stats.filmReviewQueue.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border bg-page-primary px-4 py-3"
              >
                <div>
                  <p className="font-medium text-text-primary">{p.title}</p>
                  <p className="text-xs text-text-tertiary">
                    by {p.profiles?.display_name ?? p.profiles?.username ?? "Unknown"}
                    {(p.profiles?.delivered_project_count ?? 0) === 0 && (
                      <span className="ml-2 inline-flex rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                        First-time
                      </span>
                    )}
                  </p>
                </div>
                <a
                  href={`/admin/projects?detail=${p.id}`}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Review
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-page-secondary p-5">
          <h2 className="mb-4 text-sm font-medium text-text-secondary">
            New Users (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.dailyUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#888", fontSize: 11 }}
                tickFormatter={formatDay}
                stroke="#222222"
              />
              <YAxis
                tick={{ fill: "#888", fontSize: 11 }}
                stroke="#222222"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1A1A1A",
                  border: "1px solid #222222",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                }}
                labelFormatter={(label) => formatDay(String(label))}
              />
              <Bar dataKey="count" fill="#888888" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-page-secondary p-5">
          <h2 className="mb-4 text-sm font-medium text-text-secondary">
            New Videos (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.dailyVideos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#888", fontSize: 11 }}
                tickFormatter={formatDay}
                stroke="#222222"
              />
              <YAxis
                tick={{ fill: "#888", fontSize: 11 }}
                stroke="#222222"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1A1A1A",
                  border: "1px solid #222222",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                }}
                labelFormatter={(label) => formatDay(String(label))}
              />
              <Bar dataKey="count" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
