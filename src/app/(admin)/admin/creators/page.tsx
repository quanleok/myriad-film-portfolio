"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import {
  formatCreatorDeliverySummary,
  resolveCreatorTrust,
} from "@/lib/creator-trust";

interface AdminCreator {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  star_level: number;
  is_founding_creator: boolean | null;
  released_project_count: number;
  is_banned: boolean;
  follower_count: number;
  subscriber_count: number;
  total_views: number;
  video_count: number;
  total_earnings_cents: number;
  stripe_connected: boolean;
  strike_count: number;
  creator_good_standing: boolean;
  created_at: string;
}

interface CreatorDetailProject {
  id: string;
  title: string;
  slug: string | null;
  lifecycle_status: string;
  moderation_status: string;
  preorder_count_cache: number;
  unlock_target: number | null;
  preorder_price_cents: number | null;
  created_at: string;
  delivered_at: string | null;
}

interface CreatorDetail {
  creator: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    email: string | null;
    is_banned: boolean;
    star_level: number;
    is_founding_creator: boolean | null;
    released_project_count: number;
    stripe_connected: boolean;
    strike_count: number;
    creator_good_standing: boolean;
    delivered_project_count: number;
    available_balance_cents: number;
    held_balance_cents: number;
    follower_count: number;
    total_views: number;
    created_at: string;
  };
  projects: CreatorDetailProject[];
  strikes: { title: string; message: string; created_at: string }[];
}

interface FoundingApplication {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  invite_code: string | null;
  portfolio_link: string | null;
  ai_tools: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
}

interface InviteCode {
  id: string;
  code: string;
  max_uses: number;
  use_count: number;
  program: "general" | "founding_creator";
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatInviteProgram(program: InviteCode["program"]): string {
  return program === "founding_creator" ? "Founding Creator" : "General";
}

const STAR_LABELS = ["New Creator", "Rising Creator", "Verified Creator", "Star Creator"];

function TrustSummary({
  isFoundingCreator,
  releasedProjectCount,
  className,
}: {
  isFoundingCreator: boolean | null;
  releasedProjectCount: number;
  className?: string;
}) {
  const trust = resolveCreatorTrust({
    isFoundingCreator,
    releasedProjectCount,
  });

  return (
    <div className={className}>
      <CreatorTrustBadges trust={trust} />
      <p className="mt-1 text-xs text-text-tertiary">
        {formatCreatorDeliverySummary(trust)}
      </p>
    </div>
  );
}

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [applications, setApplications] = useState<FoundingApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [foundingActionLoading, setFoundingActionLoading] = useState<string | null>(null);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteCodesLoading, setInviteCodesLoading] = useState(true);
  const [inviteCodesError, setInviteCodesError] = useState<string | null>(null);
  const [inviteCodesMessage, setInviteCodesMessage] = useState<string | null>(null);
  const [inviteCodesCreateLoading, setInviteCodesCreateLoading] = useState(false);
  const [inviteCodeUpdateLoading, setInviteCodeUpdateLoading] = useState<string | null>(null);
  const [inviteCodeCopyValue, setInviteCodeCopyValue] = useState<string | null>(null);
  const [inviteCodeMaxUsesDraft, setInviteCodeMaxUsesDraft] = useState<Record<string, string>>({});
  const [inviteCodeForm, setInviteCodeForm] = useState({
    program: "founding_creator" as InviteCode["program"],
    count: "1",
    maxUses: "1",
    customCode: "",
    expiresAt: "",
  });

  // Detail panel
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CreatorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Strike modal
  const [strikeModal, setStrikeModal] = useState<{
    creatorId: string;
    displayName: string;
    currentStrikes: number;
  } | null>(null);
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeLoading, setStrikeLoading] = useState(false);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/creators?${params}`);
    const data = await res.json();
    setCreators(data.creators ?? []);
    setLoading(false);
  }, [search]);

  const fetchApplications = useCallback(async () => {
    setApplicationsLoading(true);
    const res = await fetch("/api/admin/founding-applications");
    const data = await res.json();
    setApplications(data.applications ?? []);
    setApplicationsLoading(false);
  }, []);

  const fetchInviteCodes = useCallback(async () => {
    setInviteCodesLoading(true);
    setInviteCodesError(null);
    try {
      const res = await fetch("/api/admin/invite-codes");
      const data = await res.json();
      if (!res.ok) {
        setInviteCodes([]);
        setInviteCodesError(data.error ?? "Failed to load invite codes.");
        return;
      }
      const codes = (data.codes ?? []) as InviteCode[];
      setInviteCodes(codes);
      setInviteCodeMaxUsesDraft(
        Object.fromEntries(codes.map((code) => [code.id, String(code.max_uses)]))
      );
    } catch {
      setInviteCodes([]);
      setInviteCodesError("Failed to load invite codes.");
    } finally {
      setInviteCodesLoading(false);
    }
  }, []);

  const fetchDetail = useCallback(async (creatorId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}`);
      const data = await res.json();
      if (data.creator) {
        setDetail(data);
      } else {
        setDetail(null);
      }
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreators();
    fetchApplications();
    fetchInviteCodes();
  }, [fetchCreators, fetchApplications, fetchInviteCodes]);

  // Fetch detail when detailId changes
  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    void fetchDetail(detailId);
  }, [detailId, fetchDetail]);

  async function handleAction(
    action: string,
    creatorId: string,
    value?: number | boolean
  ) {
    setActionLoading(creatorId);
    await fetch("/api/admin/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, creatorId, value }),
    });
    await fetchCreators();
    if (detailId === creatorId) {
      await fetchDetail(creatorId);
    }
    setActionLoading(null);
  }

  async function handleStrike(creatorId: string, reason: string) {
    setStrikeLoading(true);
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/strike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to issue strike");
      }
    } catch {
      alert("Network error");
    }
    setStrikeModal(null);
    setStrikeReason("");
    setStrikeLoading(false);
    await fetchCreators();
  }

  async function handleFoundingApplication(applicationId: string, action: "approve" | "reject") {
    setFoundingActionLoading(applicationId);
    await fetch("/api/admin/founding-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action }),
    });
    setFoundingActionLoading(null);
    await Promise.all([fetchApplications(), fetchCreators()]);
  }

  async function handleCreateInviteCodes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteCodesCreateLoading(true);
    setInviteCodesError(null);
    setInviteCodesMessage(null);

    const payload: {
      program: InviteCode["program"];
      count: number;
      max_uses: number;
      custom_code?: string;
      expires_at?: string;
    } = {
      program: inviteCodeForm.program,
      count: Math.max(1, Number(inviteCodeForm.count || "1")),
      max_uses: Math.max(1, Number(inviteCodeForm.maxUses || "1")),
    };

    const customCode = inviteCodeForm.customCode.trim().toUpperCase();
    if (customCode) payload.custom_code = customCode;
    if (inviteCodeForm.expiresAt) payload.expires_at = new Date(inviteCodeForm.expiresAt).toISOString();

    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteCodesError(data.error ?? "Failed to generate invite codes.");
        return;
      }
      const createdCount = Array.isArray(data.codes) ? data.codes.length : 0;
      setInviteCodesMessage(
        createdCount === 1 ? "Invite code created." : `${createdCount} invite codes created.`
      );
      setInviteCodeForm((current) => ({
        ...current,
        count: "1",
        customCode: "",
        expiresAt: "",
      }));
      await fetchInviteCodes();
    } catch {
      setInviteCodesError("Failed to generate invite codes.");
    } finally {
      setInviteCodesCreateLoading(false);
    }
  }

  async function handleInviteCodeUpdate(
    inviteCodeId: string,
    updates: { is_active?: boolean; max_uses?: number }
  ) {
    setInviteCodeUpdateLoading(inviteCodeId);
    setInviteCodesError(null);
    setInviteCodesMessage(null);
    try {
      const res = await fetch("/api/admin/invite-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inviteCodeId, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteCodesError(data.error ?? "Failed to update invite code.");
        return;
      }
      setInviteCodesMessage("Invite code updated.");
      await fetchInviteCodes();
    } catch {
      setInviteCodesError("Failed to update invite code.");
    } finally {
      setInviteCodeUpdateLoading(null);
    }
  }

  async function handleCopyInviteCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setInviteCodeCopyValue(code);
      setInviteCodesMessage(`Copied ${code}.`);
      window.setTimeout(() => {
        setInviteCodeCopyValue((current) => (current === code ? null : current));
      }, 2000);
    } catch {
      setInviteCodesError("Failed to copy invite code.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Creators</h1>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creators..."
          className="rounded-lg border border-border bg-page-secondary px-4 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-text-primary">Founding Creator Applications</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Approving an application grants creator access, marks the user as a founding creator, and bypasses the separate creator onboarding wall.
          </p>
        </div>
        <div className="divide-y divide-border">
          {applicationsLoading ? (
            <div className="px-4 py-8 text-sm text-text-tertiary">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="px-4 py-8 text-sm text-text-tertiary">No founding creator applications yet.</div>
          ) : (
            applications.map((application) => (
              <div key={application.id} className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-text-primary">{application.display_name}</p>
                    <p className="text-sm text-text-secondary">{application.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
                    <span className="rounded-full border border-border px-2 py-1 uppercase tracking-[0.14em]">
                      {application.status}
                    </span>
                    {application.invite_code ? (
                      <span className="rounded-full border border-border px-2 py-1">
                        Invite: {application.invite_code}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-border px-2 py-1">
                      {new Date(application.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {application.portfolio_link ? (
                    <p className="text-sm text-text-secondary">
                      Portfolio:{" "}
                      <Link
                        href={application.portfolio_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 underline underline-offset-4"
                      >
                        {application.portfolio_link}
                      </Link>
                    </p>
                  ) : null}
                  {application.ai_tools.length > 0 ? (
                    <p className="text-sm text-text-secondary">
                      AI tools: {application.ai_tools.join(", ")}
                    </p>
                  ) : null}
                </div>
                {application.status === "pending" ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFoundingApplication(application.id, "approve")}
                      disabled={foundingActionLoading === application.id}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFoundingApplication(application.id, "reject")}
                      disabled={foundingActionLoading === application.id}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-text-primary">Invite Codes</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Generate and manage general or founding creator invite codes without leaving the admin panel.
          </p>
        </div>
        <div className="space-y-4 px-4 py-4">
          <form
            onSubmit={handleCreateInviteCodes}
            className="grid gap-3 rounded-xl border border-border bg-page p-4 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1.2fr_auto]"
          >
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
                Program
              </span>
              <select
                value={inviteCodeForm.program}
                onChange={(e) =>
                  setInviteCodeForm((current) => ({
                    ...current,
                    program: e.target.value as InviteCode["program"],
                  }))
                }
                className="w-full rounded-lg border border-border bg-page-secondary px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="founding_creator">Founding Creator</option>
                <option value="general">General</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
                Custom Code
              </span>
              <input
                type="text"
                value={inviteCodeForm.customCode}
                onChange={(e) =>
                  setInviteCodeForm((current) => ({
                    ...current,
                    customCode: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="Optional"
                className="w-full rounded-lg border border-border bg-page-secondary px-3 py-2 text-sm uppercase text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
                maxLength={32}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
                Count
              </span>
              <input
                type="number"
                min={1}
                max={50}
                value={inviteCodeForm.count}
                onChange={(e) =>
                  setInviteCodeForm((current) => ({
                    ...current,
                    count: e.target.value,
                  }))
                }
                disabled={inviteCodeForm.customCode.trim().length > 0}
                className="w-full rounded-lg border border-border bg-page-secondary px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
                Max Uses
              </span>
              <input
                type="number"
                min={1}
                max={10000}
                value={inviteCodeForm.maxUses}
                onChange={(e) =>
                  setInviteCodeForm((current) => ({
                    ...current,
                    maxUses: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border bg-page-secondary px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
                Expires
              </span>
              <input
                type="datetime-local"
                value={inviteCodeForm.expiresAt}
                onChange={(e) =>
                  setInviteCodeForm((current) => ({
                    ...current,
                    expiresAt: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border bg-page-secondary px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={inviteCodesCreateLoading}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
              >
                {inviteCodesCreateLoading ? "Creating..." : "Create Code"}
              </button>
            </div>
          </form>

          {inviteCodesError ? (
            <p className="text-sm text-red-700 dark:text-red-400">{inviteCodesError}</p>
          ) : null}
          {inviteCodesMessage ? (
            <p className="text-sm text-green-700 dark:text-green-400">{inviteCodesMessage}</p>
          ) : null}

          <div className="rounded-xl border border-border bg-page">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Recent Codes</h3>
                <p className="text-xs text-text-tertiary">Newest first. Toggle codes or adjust max uses in place.</p>
              </div>
              <button
                type="button"
                onClick={() => fetchInviteCodes()}
                disabled={inviteCodesLoading}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-page-secondary hover:text-text-primary disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
            {inviteCodesLoading ? (
              <div className="px-4 py-8 text-sm text-text-tertiary">Loading invite codes...</div>
            ) : inviteCodes.length === 0 ? (
              <div className="px-4 py-8 text-sm text-text-tertiary">No invite codes generated yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {inviteCodes.map((inviteCode) => {
                  const draftMaxUses = inviteCodeMaxUsesDraft[inviteCode.id] ?? String(inviteCode.max_uses);
                  const parsedMaxUses = Math.max(1, Number(draftMaxUses || inviteCode.max_uses));
                  const maxUsesChanged = parsedMaxUses !== inviteCode.max_uses;

                  return (
                    <div
                      key={inviteCode.id}
                      className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-sm font-semibold tracking-[0.16em] text-text-primary">
                            {inviteCode.code}
                          </p>
                          <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">
                            {formatInviteProgram(inviteCode.program)}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                              inviteCode.is_active
                                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                                : "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {inviteCode.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
                          <span>
                            Uses: {inviteCode.use_count} / {inviteCode.max_uses}
                          </span>
                          <span>
                            Created {new Date(inviteCode.created_at).toLocaleDateString()}
                          </span>
                          <span>
                            Expires{" "}
                            {inviteCode.expires_at
                              ? new Date(inviteCode.expires_at).toLocaleString()
                              : "Never"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="space-y-2">
                          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                            Max Uses
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            value={draftMaxUses}
                            onChange={(e) =>
                              setInviteCodeMaxUsesDraft((current) => ({
                                ...current,
                                [inviteCode.id]: e.target.value,
                              }))
                            }
                            className="w-28 rounded-lg border border-border bg-page-secondary px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyInviteCode(inviteCode.code)}
                            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-page-secondary"
                          >
                            {inviteCodeCopyValue === inviteCode.code ? "Copied" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleInviteCodeUpdate(inviteCode.id, {
                                is_active: !inviteCode.is_active,
                              })
                            }
                            disabled={inviteCodeUpdateLoading === inviteCode.id}
                            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-page-secondary disabled:opacity-60"
                          >
                            {inviteCodeUpdateLoading === inviteCode.id
                              ? "Saving..."
                              : inviteCode.is_active
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleInviteCodeUpdate(inviteCode.id, {
                                max_uses: parsedMaxUses,
                              })
                            }
                            disabled={!maxUsesChanged || inviteCodeUpdateLoading === inviteCode.id}
                            className="rounded-lg bg-surface-active px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover disabled:opacity-50"
                          >
                            Save Limit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table + Detail panel */}
      <div className="flex gap-6">
      <div className={`overflow-x-auto rounded-xl border border-border ${detailId ? "flex-1 min-w-0" : "w-full"}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-page-secondary">
            <tr>
              <th className="px-4 py-3 text-text-secondary font-medium">Creator</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Trust</th>
              <th className="px-4 py-3 text-text-secondary font-medium text-right">Videos</th>
              <th className="px-4 py-3 text-text-secondary font-medium text-right">Earnings</th>
              <th className="px-4 py-3 text-text-secondary font-medium text-center">Strikes</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Standing</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Status</th>
              <th className="px-4 py-3 text-text-secondary font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-text-tertiary">
                  Loading...
                </td>
              </tr>
            ) : creators.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-text-tertiary">
                  No creators found.
                </td>
              </tr>
            ) : (
              creators.map((c) => (
                <tr
                  key={c.id}
                  className={`transition-colors cursor-pointer ${
                    detailId === c.id ? "bg-surface" : "bg-page hover:bg-page-secondary"
                  }`}
                  onClick={() => setDetailId(detailId === c.id ? null : c.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-surface-active">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">
                            {c.display_name?.[0] ?? "?"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{c.display_name}</p>
                        <p className="text-xs text-text-tertiary">@{c.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TrustSummary
                      isFoundingCreator={c.is_founding_creator}
                      releasedProjectCount={c.released_project_count ?? 0}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">
                    {c.video_count}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">
                    {formatCents(c.total_earnings_cents)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.strike_count >= 3
                          ? "bg-red-500/20 text-red-700 dark:text-red-400"
                          : c.strike_count > 0
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                            : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {c.strike_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.creator_good_standing
                          ? "bg-green-500/20 text-green-700 dark:text-green-400"
                          : "bg-red-500/20 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {c.creator_good_standing ? "Good" : "Bad"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.is_banned
                          ? "bg-red-500/20 text-red-700 dark:text-red-400"
                          : "bg-green-500/20 text-green-700 dark:text-green-400"
                      }`}
                    >
                      {c.is_banned ? "Banned" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/creator/${c.username}`}
                        className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        target="_blank"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() =>
                          setStrikeModal({
                            creatorId: c.id,
                            displayName: c.display_name,
                            currentStrikes: c.strike_count ?? 0,
                          })
                        }
                        className="rounded px-2 py-1 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        Strike
                      </button>
                      <button
                        onClick={() =>
                          handleAction(
                            c.is_banned ? "unban" : "ban",
                            c.id
                          )
                        }
                        disabled={actionLoading === c.id}
                        className={`rounded px-2 py-1 text-xs disabled:opacity-50 ${
                          c.is_banned
                            ? "text-green-700 dark:text-green-400 hover:bg-green-500/20"
                            : "text-red-700 dark:text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {actionLoading === c.id
                          ? "..."
                          : c.is_banned
                            ? "Unban"
                            : "Ban"}
                      </button>
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
            <div className="p-6 text-center text-text-tertiary">Loading details...</div>
          ) : !detail ? (
            <div className="p-6 text-center text-text-tertiary">Failed to load creator details.</div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {detail.creator.avatar_url ? (
                    <img src={detail.creator.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-surface-active flex items-center justify-center text-lg text-text-secondary">
                      {(detail.creator.display_name ?? "?")[0]}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {detail.creator.display_name ?? "Unknown"}
                    </h2>
                    <p className="text-xs text-text-tertiary">@{detail.creator.username ?? "—"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailId(null)}
                  className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-surface"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* Bio */}
              {detail.creator.bio && (
                <p className="text-sm text-text-secondary">{detail.creator.bio}</p>
              )}

              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
                  Trust Status
                </p>
                <TrustSummary
                  isFoundingCreator={detail.creator.is_founding_creator}
                  releasedProjectCount={detail.creator.released_project_count ?? 0}
                  className="mt-3"
                />
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-text-tertiary">Founding Member</p>
                    <p className="text-text-primary">
                      {detail.creator.is_founding_creator ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Verified Delivery</p>
                    <p className="text-text-primary">
                      {(detail.creator.released_project_count ?? 0) > 0 ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-text-tertiary">Email</p>
                  <p className="text-text-primary truncate">{detail.creator.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Stripe</p>
                  <p className={detail.creator.stripe_connected ? "text-green-700 dark:text-green-400" : "text-text-tertiary"}>
                    {detail.creator.stripe_connected ? "Connected" : "Not connected"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Released Projects</p>
                  <p className="text-text-primary">{detail.creator.released_project_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Standing</p>
                  <p className={detail.creator.creator_good_standing ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                    {detail.creator.creator_good_standing ? "Good" : "Bad"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Strikes</p>
                  <p className={detail.creator.strike_count > 0 ? "text-red-700 dark:text-red-400" : "text-text-primary"}>
                    {detail.creator.strike_count ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Followers</p>
                  <p className="text-text-primary">{detail.creator.follower_count ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Available Balance</p>
                  <p className="text-text-primary">{formatCents(detail.creator.available_balance_cents ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Held Balance</p>
                  <p className="text-text-primary">{formatCents(detail.creator.held_balance_cents ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Joined</p>
                  <p className="text-text-primary">{new Date(detail.creator.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Status</p>
                  <p className={detail.creator.is_banned ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}>
                    {detail.creator.is_banned ? "Banned" : "Active"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
                      Legacy Stars
                    </p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Internal-only legacy ranking. No longer shown on public creator surfaces.
                    </p>
                  </div>
                  <select
                    value={detail.creator.star_level}
                    onChange={(e) =>
                      handleAction("set_star_level", detail.creator.id, parseInt(e.target.value, 10))
                    }
                    className="rounded border border-border bg-page px-2 py-1 text-xs text-text-primary focus:outline-none"
                  >
                    {STAR_LABELS.map((label, i) => (
                      <option key={i} value={i}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setStrikeModal({
                      creatorId: detail.creator.id,
                      displayName: detail.creator.display_name ?? "Unknown",
                      currentStrikes: detail.creator.strike_count ?? 0,
                    })
                  }
                  className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  Issue Strike
                </button>
                <Link
                  href={`/creator/${detail.creator.username}`}
                  target="_blank"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface"
                >
                  View Profile
                </Link>
              </div>

              {/* Projects */}
              {detail.projects.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary mb-2">
                    Projects ({detail.projects.length})
                  </h3>
                  <div className="space-y-2">
                    {detail.projects.map((p) => (
                      <div key={p.id} className="rounded-lg border border-border bg-page p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-text-primary line-clamp-1">{p.title}</p>
                          <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            p.lifecycle_status === "teaser" ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400" :
                            p.lifecycle_status === "unlocking" ? "border-white/30 bg-white/10 text-white/80 dark:text-white/70" :
                            p.lifecycle_status === "in_production" ? "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                            p.lifecycle_status === "premiering" ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            p.lifecycle_status === "released" ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400" :
                            "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                          }`}>
                            {p.lifecycle_status === "teaser" ? "Teaser" :
                             p.lifecycle_status === "in_production" ? "In Production" :
                             p.lifecycle_status === "failed_to_unlock" ? "Did Not Unlock" :
                             p.lifecycle_status.charAt(0).toUpperCase() + p.lifecycle_status.slice(1)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
                          <span>{p.preorder_count_cache ?? 0}{p.unlock_target ? ` / ${p.unlock_target}` : ""} preorders</span>
                          <span>{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strike history */}
              {detail.strikes.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary mb-2">
                    Strike History
                  </h3>
                  <div className="space-y-1">
                    {detail.strikes.map((s, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-text-tertiary">{new Date(s.created_at).toLocaleDateString()}</span>
                        <span className="text-text-secondary ml-2">{s.message || s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Strike modal */}
      {strikeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-page-secondary p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">
              Issue Strike to {strikeModal.displayName}
            </h2>
            <p className="text-sm text-text-secondary">
              Current strikes: <span className={strikeModal.currentStrikes >= 2 ? "text-red-700 dark:text-red-400 font-medium" : "text-text-primary font-medium"}>{strikeModal.currentStrikes}</span>
              {strikeModal.currentStrikes >= 2 && (
                <span className="text-red-700 dark:text-red-400 ml-2">
                  (next strike will revoke good standing)
                </span>
              )}
            </p>
            <textarea
              value={strikeReason}
              onChange={(e) => setStrikeReason(e.target.value)}
              placeholder="Reason for strike (visible to creator)"
              className="w-full rounded-lg border border-border bg-page px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setStrikeModal(null);
                  setStrikeReason("");
                }}
                className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStrike(strikeModal.creatorId, strikeReason)
                }
                disabled={strikeLoading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {strikeLoading ? "Issuing..." : "Issue Strike"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
