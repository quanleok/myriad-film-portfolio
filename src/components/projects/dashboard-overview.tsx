"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PillTabs } from "@/components/ui/pill-tabs";
import { StripeConnectButton } from "@/components/payment/stripe-connect-button";
import { FoundingProgramPanel } from "@/components/founding/founding-program-panel";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import type { FoundingProgramStatus } from "@/lib/founding-program";
import { cn, formatCount, formatPrice } from "@/lib/utils";
import { formatCreatorDeliverySummary } from "@/lib/creator-trust";
import {
  getLaunchReadiness,
  summarizeMissingLaunchFields,
} from "@/lib/project-launch-readiness";
import type {
  DashboardCreatorStatus,
  DashboardLaunchNotice,
  DashboardProject,
  DashboardTab,
} from "./project-dashboard";
import { LifecycleBadge } from "./lifecycle-badge";
import { getLifecycleHoverGlow } from "./lifecycle-visuals";
import { ProjectPendingInvites, type DashboardPendingInvite } from "./project-pending-invites";
import { getProjectTeaserThumbnailUrl } from "./utils";

type ProjectSectionKey =
  | "attention"
  | "ready"
  | "active"
  | "released"
  | "drafts"
  | "archive";

interface DashboardOverviewProps {
  projects: DashboardProject[];
  pendingInvites: DashboardPendingInvite[];
  selectedTab: DashboardTab;
  onSelectProject: (id: string) => void;
  creatorStatus: DashboardCreatorStatus | null;
  foundingProgram: FoundingProgramStatus | null;
  launchNotice: DashboardLaunchNotice | null;
  stripeReady: boolean;
  canCreateProjects: boolean;
  accountHealth: {
    creatorGoodStanding: boolean;
    strikeCount: number;
    activeFlags: number;
    stripeReady: boolean;
  };
  profileBalance: {
    availableBalanceCents: number;
    heldBalanceCents: number;
    deliveredProjectCount: number;
  };
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function isModerationIssue(project: DashboardProject): boolean {
  return ["flagged", "rejected", "suspended"].includes(project.moderation_status);
}

function getProjectReadiness(project: DashboardProject) {
  return getLaunchReadiness({
    launchMode: project.launch_mode,
    title: project.title,
    hook: project.hook,
    synopsis: project.synopsis,
    genre: project.genre,
    contentRating: project.content_rating,
    teaserAssetId: project.teaser_asset_id,
    preorderPriceCents: project.preorder_price_cents,
    unlockTarget: project.unlock_target,
    campaignDurationDays: project.campaign_duration_days,
    productionWindowDays: project.production_window_days,
    releasePriceCents: project.release_price_cents,
    episodeCount: project.episode_count,
    format: project.format,
    filmVideoId: project.film_video_id,
  });
}

function isPendingReview(project: DashboardProject): boolean {
  return project.moderation_status === "pending_review";
}

function getProjectSection(project: DashboardProject): ProjectSectionKey {
  if (project.is_overdue || project.manual_greenlight_eligible || isModerationIssue(project)) {
    return "attention";
  }
  // Direct premiere/release projects in pending_review need creator attention (awaiting admin)
  if (isPendingReview(project)) {
    return "attention";
  }
  if (["teaser", "unlocking", "in_production", "premiering"].includes(project.lifecycle_status)) {
    return "active";
  }
  if (project.lifecycle_status === "released") {
    return "released";
  }
  if (project.lifecycle_status === "failed_to_unlock" || project.lifecycle_status === "cancelled") {
    return "archive";
  }
  if (project.lifecycle_status === "draft") {
    return getProjectReadiness(project).ready ? "ready" : "drafts";
  }
  return "drafts";
}

function getStatusSortWeight(project: DashboardProject): number {
  if (project.is_overdue) return 0;
  if (isModerationIssue(project)) return 1;
  if (isPendingReview(project)) return 2;
  if (project.manual_greenlight_eligible) return 3;

  switch (project.lifecycle_status) {
    case "teaser":
      return 10;
    case "unlocking":
      return 11;
    case "in_production":
      return 12;
    case "premiering":
      return 13;
    case "released":
      return 20;
    case "draft":
      return 30;
    case "failed_to_unlock":
      return 40;
    case "cancelled":
      return 41;
    default:
      return 99;
  }
}

function sortProjects(projects: DashboardProject[]): DashboardProject[] {
  return [...projects].sort((a, b) => {
    const statusDelta = getStatusSortWeight(a) - getStatusSortWeight(b);
    if (statusDelta !== 0) return statusDelta;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function getSectionCopy(section: ProjectSectionKey): {
  title: string;
  body: string;
} {
  switch (section) {
    case "attention":
      return {
        title: "Needs Action",
        body: "Handle the projects with deadlines, moderation issues, or decision points first.",
      };
    case "ready":
      return {
        title: "Ready To Go Live",
        body: "These drafts already have the saved essentials. Open them and publish when you want them live.",
      };
    case "active":
      return {
        title: "In Motion",
        body: "These are the live launches and productions that still need regular creator attention.",
      };
    case "released":
      return {
        title: "Released",
        body: "Stable releases and watch-ready titles.",
      };
    case "drafts":
      return {
        title: "Drafts",
        body: "Incomplete drafts that still need essentials before they should go live.",
      };
    case "archive":
      return {
        title: "Archived / Relaunch",
        body: "Failed campaigns, cancelled titles, and concepts you may want to reuse later.",
      };
  }
}

function getProjectNextAction(project: DashboardProject): string {
  const readiness = getProjectReadiness(project);

  if (isModerationIssue(project)) {
    return "Resolve moderation issue";
  }
  if (isPendingReview(project)) {
    return "Awaiting admin review";
  }
  if (project.is_overdue) {
    return "Deliver now";
  }
  if (project.manual_greenlight_eligible) {
    return "Approve and start production";
  }

  switch (project.lifecycle_status) {
    case "draft":
      if (readiness.ready) {
        if (project.launch_mode === "teaser") return "Post teaser";
        return project.launch_mode === "preorder" ? "Launch campaign" : "Launch project";
      }
      return project.launch_mode === "teaser" ? "Finish teaser" : "Finish launch setup";
    case "teaser":
      return "Share teaser";
    case "unlocking":
      return "Push preorders";
    case "in_production":
      return project.production_progress >= 100 ? "Deliver film" : "Post progress";
    case "premiering":
      return project.film_video_id ? "Manage premiere" : "Deliver film";
    case "released":
      return project.release_option === "free" ? "Share release" : "Open watch surface";
    case "failed_to_unlock":
      return "Edit and relaunch";
    case "cancelled":
      return "Review archive";
    default:
      return "Open project";
  }
}

function getProjectMeta(project: DashboardProject): string {
  if (isPendingReview(project)) {
    return "Submitted — under admin review";
  }

  const readiness = getProjectReadiness(project);

  switch (project.lifecycle_status) {
    case "teaser": {
      const interestCount = project.like_count_cache + project.save_count_cache;
      return `${formatCount(interestCount)} interested · ${formatCount(project.discussion_count_cache)} discussion`;
    }
    case "unlocking": {
      const days = daysUntil(project.campaign_ends_at);
      const preorders = `${project.preorder_count_cache} / ${project.unlock_target ?? "—"} preorders`;
      return days === null ? preorders : `${preorders} · ${days} day${days === 1 ? "" : "s"} left`;
    }
    case "in_production": {
      const deadline = daysUntil(project.delivery_deadline ?? project.estimated_delivery_at);
      return `${project.production_progress}% complete${deadline === null ? "" : ` · ${deadline} day${deadline === 1 ? "" : "s"} to delivery`}`;
    }
    case "premiering":
      return project.film_video_id ? "Film ready · schedule or manage premiere" : "Final film still needs delivery";
    case "released":
      return project.ledger_revenue_cents > 0
        ? `${formatPrice(project.ledger_revenue_cents)} gross revenue`
        : "Release is live";
    case "draft":
      if (readiness.ready) {
        return project.launch_mode === "teaser" ? "Ready to post" : "Ready to launch";
      }
      return summarizeMissingLaunchFields(readiness.missingFields);
    case "failed_to_unlock":
      return "Campaign ended below unlock threshold";
    case "cancelled":
      return "Project was cancelled";
    default:
      return formatDate(project.updated_at);
  }
}

function getProjectSupportCopy(project: DashboardProject): string {
  const readiness = getProjectReadiness(project);

  if (isModerationIssue(project)) {
    return "This title is blocked by moderation review. Fix that before anything else.";
  }
  if (project.is_overdue) {
    return "Delivery timing is now the biggest trust risk on this project.";
  }
  if (project.manual_greenlight_eligible) {
    return "This campaign crossed the manual greenlight threshold. Decide whether to move into production.";
  }

  switch (project.lifecycle_status) {
    case "draft":
      if (readiness.ready) {
        return project.launch_mode === "teaser"
          ? "This teaser already has the saved essentials. Open it, confirm rights and terms, and post it live."
          : "This launch already has the core saved essentials. Open it, confirm the final commitments, and launch when ready.";
      }
      return project.launch_mode === "teaser"
        ? "Only the teaser essentials matter here. Characters, concept art, and longer story are optional polish."
        : "Get the core launch requirements in place first. Optional polish can wait until the page is actually ready to go live.";
    case "teaser":
      return "Teasers are live signal pages. Share it while it is fresh, then convert when you want real launch rules.";
    case "unlocking":
      return "The main job here is momentum: improve the page and drive traffic while the campaign is still interesting.";
    case "in_production":
      return "Keep the page alive with visible progress and a believable delivery story.";
    case "premiering":
      return "The next important action is the release event, not more production polish.";
    case "released":
      return project.release_option === "free"
        ? "This title is already free. Focus on sharing and watch conversion."
        : "Release is stable. Focus on watch-page traffic and conversion.";
    case "failed_to_unlock":
      return "Treat this as a relaunch candidate, not a dead artifact.";
    case "cancelled":
      return "Keep this de-emphasized unless you intend to reuse the concept.";
    default:
      return "Open the project and continue from the most relevant next step.";
  }
}

function getFeeSummary(creatorStatus: DashboardCreatorStatus | null): {
  label: string;
  value: string;
  body: string;
} {
  if (!creatorStatus) {
    return {
      label: "Current fee",
      value: "—",
      body: "Creator fee state becomes available after onboarding.",
    };
  }

  const percent = `${Math.round(creatorStatus.platformFeeRate * 100)}%`;
  if (!creatorStatus.isFoundingCreator) {
    return {
      label: "Standard fee",
      value: percent,
      body: "Standard creator rate across preorders and sales.",
    };
  }

  if (creatorStatus.platformFeeRate === 0) {
    return {
      label: "Founding fee",
      value: percent,
      body: "Founding promo rate is active right now.",
    };
  }

  return {
    label: "Founding fee",
    value: percent,
    body: "Founding lifetime rate after the promo window.",
  };
}

function getPayoutSummary(
  creatorStatus: DashboardCreatorStatus | null,
  profileBalance: DashboardOverviewProps["profileBalance"],
  stripeReady: boolean
): {
  title: string;
  body: string;
} {
  if (!stripeReady) {
    return {
      title: "Connect Stripe before payout day",
      body: "Your launch surfaces can go live, but withdrawals stay blocked until Stripe onboarding is complete.",
    };
  }

  if (profileBalance.availableBalanceCents > 0) {
    return {
      title: "Funds are ready to withdraw",
      body: `You currently have ${formatPrice(profileBalance.availableBalanceCents)} available. The rest of your creator share, if any, stays in held balance until its release rules clear.`,
    };
  }

  if (profileBalance.heldBalanceCents > 0) {
    return creatorStatus?.trust.verifiedDelivery
      ? {
          title: "Some creator share is still held",
          body: `You are on the proven-creator path, but ${formatPrice(profileBalance.heldBalanceCents)} is still waiting on delivery or release timing rules.`,
        }
      : {
          title: "You are still on the new-creator payout tier",
          body: `New creators unlock preorder funds after delivery. Right now ${formatPrice(profileBalance.heldBalanceCents)} is still held.`,
        };
  }

  return creatorStatus?.trust.verifiedDelivery
    ? {
        title: "Payout tier is already upgraded",
        body: "You already have verified delivery history, so qualifying projects can release part of your share earlier when the mechanics allow it.",
      }
    : {
        title: "No payout available yet",
        body: "You are still on the new-creator path. Once a project monetizes and clears its release rules, balances will show up here automatically.",
      };
}

function getProjectsEmptyState(canCreateProjects: boolean): {
  title: string;
  body: string;
} {
  if (!canCreateProjects) {
    return {
      title: "No project access yet",
      body: "Accepted collaborations and pending invites will appear here once a project owner brings you in.",
    };
  }

  return {
    title: "No projects in motion yet",
    body: "This dashboard is where you track launches, balances, delivery, and the projects that need attention once they exist.",
  };
}

function StatusMetricCard({
  label,
  value,
  body,
  tone = "default",
}: {
  label: string;
  value: string;
  body: string;
  tone?: "default" | "success" | "warning";
}) {
  const valueClassName =
    tone === "success"
      ? "text-role-success-fg"
      : tone === "warning"
        ? "text-role-warning-fg"
        : "text-text-primary";

  return (
    <div className="rounded-3xl border border-role-border-subtle bg-page p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
      <p className={cn("mt-3 font-display text-3xl font-bold", valueClassName)}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
    </div>
  );
}

function CreatorStatusRail({
  creatorStatus,
  profileBalance,
  stripeReady,
  accountHealth,
}: {
  creatorStatus: DashboardCreatorStatus;
  profileBalance: DashboardOverviewProps["profileBalance"];
  stripeReady: boolean;
  accountHealth: DashboardOverviewProps["accountHealth"];
}) {
  const feeSummary = getFeeSummary(creatorStatus);
  const payoutSummary = getPayoutSummary(creatorStatus, profileBalance, stripeReady);
  const trustLabel = formatCreatorDeliverySummary(creatorStatus.trust);
  const hasHealthIssue =
    !accountHealth.creatorGoodStanding ||
    accountHealth.strikeCount > 0 ||
    accountHealth.activeFlags > 0;

  return (
    <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_24%),radial-gradient(circle_at_85%_8%,rgba(245,158,11,0.14),transparent_22%),linear-gradient(180deg,rgba(8,14,12,0.98)_0%,rgba(6,9,11,1)_100%)]">
      <CardContent className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">Creator Status</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl font-bold text-white">Compact control center</h2>
              <CreatorTrustBadges trust={creatorStatus.trust} size="md" />
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">
              {trustLabel}. {payoutSummary.body}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/65">
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5">
                {feeSummary.label}: <span className="font-semibold text-white">{feeSummary.value}</span>
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5">
                Stripe: <span className="font-semibold text-white">{stripeReady ? "Connected" : "Needs setup"}</span>
              </span>
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5">
                Trust tier: <span className="font-semibold text-white">{trustLabel}</span>
              </span>
            </div>
          </div>

          {!stripeReady ? (
            <div className="shrink-0">
              <StripeConnectButton variant="secondary" size="sm" showInlineError={false}>
                Connect Stripe
              </StripeConnectButton>
            </div>
          ) : null}
        </div>

        {hasHealthIssue ? (
          <div className="mt-5 rounded-2xl border border-role-warning-border bg-role-warning-bg px-4 py-3 text-sm text-role-warning-fg">
            {!accountHealth.creatorGoodStanding ? "Your account needs attention." : "There are dashboard issues that need review."}{" "}
            {accountHealth.strikeCount > 0 ? `${accountHealth.strikeCount} strike${accountHealth.strikeCount === 1 ? "" : "s"}. ` : ""}
            {accountHealth.activeFlags > 0 ? `${accountHealth.activeFlags} flagged project${accountHealth.activeFlags === 1 ? "" : "s"}.` : ""}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <StatusMetricCard
            label={feeSummary.label}
            value={feeSummary.value}
            body={feeSummary.body}
          />
          <StatusMetricCard
            label="Available now"
            value={formatPrice(profileBalance.availableBalanceCents)}
            body={
              stripeReady
                ? "Ready to withdraw once you want to move it out."
                : "Balance is real, but withdrawal still needs Stripe setup."
            }
            tone={profileBalance.availableBalanceCents > 0 ? "success" : "default"}
          />
          <StatusMetricCard
            label="Held balance"
            value={formatPrice(profileBalance.heldBalanceCents)}
            body={
              creatorStatus.trust.verifiedDelivery
                ? "Held creator share waiting on delivery or release timing."
                : "New-creator preorder share stays held until delivery."
            }
            tone={profileBalance.heldBalanceCents > 0 ? "warning" : "default"}
          />
          <StatusMetricCard
            label="Payout state"
            value={stripeReady ? "Live" : "Blocked"}
            body={payoutSummary.title}
            tone={stripeReady ? "success" : "warning"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardProjectCard({
  project,
  onSelect,
}: {
  project: DashboardProject;
  onSelect: (id: string) => void;
}) {
  const hoverGlow = getLifecycleHoverGlow(project.lifecycle_status);
  const nextAction = getProjectNextAction(project);
  const meta = getProjectMeta(project);
  const body = getProjectSupportCopy(project);

  return (
    <button
      type="button"
      onClick={() => onSelect(project.id)}
      className={cn(
        "group w-full overflow-hidden rounded-[1.5rem] border border-role-border-strong bg-page-secondary/90 text-left shadow-[var(--role-surface-elev-2)] transition-all hover:-translate-y-0.5 hover:bg-page-secondary",
        hoverGlow
      )}
    >
      {getProjectTeaserThumbnailUrl(project.teaser_thumbnail_url, project.teaser_asset_id) ? (
        <div className="relative aspect-video overflow-hidden border-b border-role-border-subtle bg-black">
          <img
            src={getProjectTeaserThumbnailUrl(project.teaser_thumbnail_url, project.teaser_asset_id)!}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center border-b border-role-border-subtle bg-page text-3xl text-text-tertiary">
          🎬
        </div>
      )}

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-text-primary">{project.title}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-tertiary">Next: {nextAction}</p>
          </div>
          <LifecycleBadge status={project.lifecycle_status} />
        </div>

        <p className="text-sm font-medium text-text-primary">{meta}</p>
        <p className="text-sm leading-6 text-text-secondary">{body}</p>

        {!project.is_owner ? (
          <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">
            {project.access_role}
            {project.can_view_earnings ? " · earnings access" : ""}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function EarningsTab({
  projects,
  creatorStatus,
  profileBalance,
  stripeReady,
  canWithdraw,
}: {
  projects: DashboardProject[];
  creatorStatus: DashboardCreatorStatus | null;
  profileBalance: DashboardOverviewProps["profileBalance"];
  stripeReady: boolean;
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const revenueProjects = projects.filter(
    (project) =>
      !["draft", "teaser", "cancelled"].includes(project.lifecycle_status) &&
      (project.is_owner || project.can_view_earnings)
  );
  const totalGrossRevenue = revenueProjects.reduce(
    (sum, project) => sum + project.ledger_revenue_cents,
    0
  );
  const totalCreatorShare = revenueProjects.reduce(
    (sum, project) =>
      sum + Math.round(project.ledger_revenue_cents * (1 - project.platform_fee_rate)),
    0
  );
  const totalPreorders = revenueProjects.reduce(
    (sum, project) => sum + project.preorder_count_cache,
    0
  );
  const payoutSummary = getPayoutSummary(creatorStatus, profileBalance, stripeReady);
  const feeSummary = getFeeSummary(creatorStatus);

  async function withdrawBalance() {
    const amount = profileBalance.availableBalanceCents;
    setPendingKey("withdraw");
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/payouts/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not withdraw funds");
      setSuccessMessage("Withdrawal initiated.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Withdrawal failed");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-role-danger-border bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-2xl border border-role-success-border bg-role-success-bg px-4 py-3 text-sm text-role-success-fg">
          {successMessage}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <StatusMetricCard
              label="Available now"
              value={formatPrice(profileBalance.availableBalanceCents)}
              body="What you can withdraw immediately."
              tone={profileBalance.availableBalanceCents > 0 ? "success" : "default"}
            />
            <StatusMetricCard
              label="Held balance"
              value={formatPrice(profileBalance.heldBalanceCents)}
              body="Creator share still waiting on delivery or release timing."
              tone={profileBalance.heldBalanceCents > 0 ? "warning" : "default"}
            />
            <StatusMetricCard
              label="Creator share"
              value={formatPrice(totalCreatorShare)}
              body="Your share across monetized project activity that is visible to this account."
            />
            <StatusMetricCard
              label={feeSummary.label}
              value={feeSummary.value}
              body={feeSummary.body}
            />
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-role-border-subtle bg-page p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">{payoutSummary.title}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{payoutSummary.body}</p>
            </div>
            {canWithdraw ? (
              stripeReady ? (
                <Button
                  className="shrink-0"
                  disabled={profileBalance.availableBalanceCents < 5000 || pendingKey === "withdraw"}
                  onClick={() => void withdrawBalance()}
                >
                  {pendingKey === "withdraw" ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                  Withdraw {formatPrice(profileBalance.availableBalanceCents)}
                </Button>
              ) : (
                <StripeConnectButton className="shrink-0" showInlineError={false}>
                  Connect Stripe
                </StripeConnectButton>
              )
            ) : null}
          </div>
          {canWithdraw && profileBalance.availableBalanceCents > 0 && profileBalance.availableBalanceCents < 5000 ? (
            <p className="mt-3 text-xs text-role-warning-fg">Minimum withdrawal amount is $50.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold text-text-primary">Revenue by Project</h2>
        </CardHeader>
        <CardContent>
          {revenueProjects.length === 0 ? (
            <p className="text-sm text-text-tertiary">No revenue yet. Once a monetized project starts moving, it will show up here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-tertiary">
                    <th className="pb-2 pr-4 font-medium">Project</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 text-right font-medium">Preorders</th>
                    <th className="pb-2 pr-4 text-right font-medium">Gross</th>
                    <th className="pb-2 text-right font-medium">Creator share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {revenueProjects.map((project) => {
                    const share = Math.round(project.ledger_revenue_cents * (1 - project.platform_fee_rate));

                    return (
                      <tr key={project.id} className="text-text-secondary">
                        <td className="py-3 pr-4">
                          <span className="font-medium text-text-primary">{project.title}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <LifecycleBadge status={project.lifecycle_status} />
                        </td>
                        <td className="py-3 pr-4 text-right">{project.preorder_count_cache}</td>
                        <td className="py-3 pr-4 text-right">{formatPrice(project.ledger_revenue_cents)}</td>
                        <td className="py-3 text-right font-medium text-text-primary">{formatPrice(share)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold text-text-primary">
                    <td className="pt-3 pr-4">Total</td>
                    <td className="pt-3 pr-4" />
                    <td className="pt-3 pr-4 text-right">{totalPreorders}</td>
                    <td className="pt-3 pr-4 text-right">{formatPrice(totalGrossRevenue)}</td>
                    <td className="pt-3 text-right">{formatPrice(totalCreatorShare)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardOverview({
  projects,
  pendingInvites,
  selectedTab,
  onSelectProject,
  creatorStatus,
  foundingProgram,
  launchNotice,
  stripeReady,
  canCreateProjects,
  accountHealth,
  profileBalance,
}: DashboardOverviewProps) {
  const router = useRouter();
  const hasVisibleEarnings = projects.some((project) => project.is_owner || project.can_view_earnings);
  const activeTab = selectedTab === "earnings" && hasVisibleEarnings ? "earnings" : "projects";
  const sections = sortProjects(projects).reduce<Record<ProjectSectionKey, DashboardProject[]>>(
    (acc, project) => {
      const section = getProjectSection(project);
      acc[section].push(project);
      return acc;
    },
    { attention: [], ready: [], active: [], released: [], drafts: [], archive: [] }
  );
  const nonEmptySections = (["attention", "ready", "active", "released", "drafts", "archive"] as ProjectSectionKey[]).filter(
    (section) => sections[section].length > 0
  );
  const emptyState = getProjectsEmptyState(canCreateProjects);

  function handleTabChange(nextTab: string) {
    const params = new URLSearchParams();
    if (nextTab !== "projects") {
      params.set("tab", nextTab);
    }
    const search = params.toString();
    router.push(search ? `/dashboard?${search}` : "/dashboard");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:py-8">
      <ProjectPendingInvites invites={pendingInvites} />

      {launchNotice?.isTeaserLaunch && launchNotice.foundingAwarded ? (
        <div className="rounded-3xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          Your teaser is live, and it claimed a founding creator slot
          {typeof launchNotice.foundingSlot === "number" ? ` (#${launchNotice.foundingSlot})` : ""}. Your 0% first-year fee window is now active.
        </div>
      ) : null}

      {launchNotice?.isTeaserLaunch && !launchNotice.foundingAwarded && launchNotice.foundingExisting ? (
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/8 px-5 py-4 text-sm text-cyan-100">
          Your teaser is live. Founding creator access was already active on this account, so the teaser did not need to claim a new slot.
        </div>
      ) : null}

      {launchNotice?.isTeaserLaunch &&
      !launchNotice.foundingAwarded &&
      !launchNotice.foundingExisting ? (
        <div className="rounded-3xl border border-white/12 bg-white/[0.04] px-5 py-4 text-sm text-text-secondary">
          Your teaser is live. This launch did not claim a new founding slot, but the project page is public and ready to share now.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">Creator Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            Manage the launches already in motion, track trust and balances, and open the projects that need attention next.
          </p>
        </div>
      </div>

      {canCreateProjects && creatorStatus ? (
        <CreatorStatusRail
          creatorStatus={creatorStatus}
          profileBalance={profileBalance}
          stripeReady={stripeReady}
          accountHealth={accountHealth}
        />
      ) : null}

      {canCreateProjects &&
      creatorStatus &&
      foundingProgram &&
      !creatorStatus.isFoundingCreator &&
      foundingProgram.publicProgramOpen ? (
        <FoundingProgramPanel
          status={foundingProgram}
          title="The public founding window is still open for your first live teaser."
          body="Post a teaser before the countdown ends if you want the first-100 creator bonus. Invite codes and manual review remain separate paths."
          secondaryCtaHref="/founding-creators"
          secondaryCtaLabel="See Program"
        />
      ) : null}

      <div className="space-y-4">
        <PillTabs
          tabs={[
            { value: "projects", label: "Projects" },
            ...(hasVisibleEarnings ? [{ value: "earnings", label: "Earnings" }] : []),
          ]}
          value={activeTab}
          onValueChange={handleTabChange}
        />

        {activeTab === "earnings" ? (
          <EarningsTab
            projects={projects}
            creatorStatus={creatorStatus}
            profileBalance={profileBalance}
            stripeReady={stripeReady}
            canWithdraw={canCreateProjects}
          />
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-3xl">
                🎬
              </div>
              <h2 className="font-display text-xl font-semibold text-text-primary">{emptyState.title}</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{emptyState.body}</p>
              {canCreateProjects ? (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <Link href="/projects/new">
                    <Button>New Project</Button>
                  </Link>
                  <p className="text-sm text-text-tertiary">
                    Use New Project to choose teaser, preorder, production, release, or premiere.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {nonEmptySections.map((section) => {
              const copy = getSectionCopy(section);

              return (
                <section key={section} className="space-y-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-text-primary">{copy.title}</h2>
                      <p className="mt-1 text-sm text-text-secondary">{copy.body}</p>
                    </div>
                    <span className="rounded-full border border-role-border-subtle bg-page px-3 py-1 text-xs font-medium text-text-tertiary">
                      {sections[section].length}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sections[section].map((project) => (
                      <DashboardProjectCard
                        key={project.id}
                        project={project}
                        onSelect={onSelectProject}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
