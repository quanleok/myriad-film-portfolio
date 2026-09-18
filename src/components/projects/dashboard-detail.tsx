"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  ImageIcon,
  Loader2,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Video,
  Wallet,
} from "lucide-react";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MetricRow } from "@/components/ui/metric-row";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VideoUpload } from "@/components/ui/VideoUpload";
import { formatCount, formatPrice } from "@/lib/utils";
import { FULL_FILM_UPLOAD_MAX_MB } from "@/types/project";
import { StripeConnectButton } from "@/components/payment/stripe-connect-button";
import { formatCreatorDeliverySummary } from "@/lib/creator-trust";
import { ProjectTeamPanel } from "./project-team-panel";
import { isFreeWatchProject } from "./utils";
import type {
  ProjectLifecycleStatus,
  ProjectModerationStatus,
} from "@/types/project";
import { LifecycleBadge } from "./lifecycle-badge";
import type {
  DashboardCreatorStatus,
  DashboardProject,
  DashboardUpdate,
  DashboardDiscussionStats,
  DashboardPremiere,
} from "./project-dashboard";

/* -- Utility functions -- */

function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function updateIcon(type: DashboardUpdate["update_type"]) {
  if (type === "image") return <ImageIcon size={14} />;
  if (type === "video") return <Video size={14} />;
  return <FileText size={14} />;
}

function moderationBadgeClass(status: ProjectModerationStatus): string {
  switch (status) {
    case "pending_review":
      return "bg-role-warning-bg text-role-warning-fg";
    case "flagged":
    case "rejected":
    case "suspended":
      return "bg-role-danger-bg text-role-danger-fg";
    default:
      return "bg-surface-hover text-text-secondary";
  }
}

function deliveryState(project: DashboardProject): {
  label: string;
  tone: "green" | "amber" | "red" | "muted";
  daysRemaining: number | null;
  inGracePeriod: boolean;
} {
  if (project.delivered_at) {
    return { label: "Delivered", tone: "green", daysRemaining: null, inGracePeriod: false };
  }
  if (project.is_overdue) {
    return { label: "Overdue \u2014 strike issued", tone: "red", daysRemaining: null, inGracePeriod: false };
  }
  const deadlineDays = daysUntil(project.delivery_deadline);
  const graceDays = daysUntil(project.grace_period_end);
  if (deadlineDays !== null && deadlineDays < 0 && graceDays !== null && graceDays >= 0) {
    return { label: "Grace period", tone: "red", daysRemaining: graceDays, inGracePeriod: true };
  }
  const days = deadlineDays ?? daysUntil(project.estimated_delivery_at);
  if (days === null) return { label: "Date pending", tone: "muted", daysRemaining: null, inGracePeriod: false };
  if (days > 30) return { label: "On track", tone: "green", daysRemaining: days, inGracePeriod: false };
  if (days >= 14) return { label: "Approaching", tone: "amber", daysRemaining: days, inGracePeriod: false };
  if (days >= 0) return { label: "Urgent", tone: "red", daysRemaining: days, inGracePeriod: false };
  return { label: "Overdue", tone: "red", daysRemaining: days, inGracePeriod: false };
}

function formatFeeRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function getCreatorFeeSummary(creatorStatus: DashboardCreatorStatus | null): {
  label: string;
  body: string;
} {
  if (!creatorStatus) {
    return {
      label: "Platform fee pending",
      body: "Creator trust and fee state will appear once onboarding and project data are available.",
    };
  }

  if (!creatorStatus.isFoundingCreator) {
    return {
      label: `${formatFeeRate(creatorStatus.platformFeeRate)} standard creator fee`,
      body: "Standard creator rate across project sales and preorders.",
    };
  }

  if (creatorStatus.platformFeeRate === 0) {
    return {
      label: "0% founding promo fee",
      body: "Your founding-member promo rate is active right now.",
    };
  }

  return {
    label: `${formatFeeRate(creatorStatus.platformFeeRate)} founding fee`,
    body: "Your founding-member lifetime rate is active.",
  };
}

function getPayoutContextCopy(
  project: DashboardProject,
  creatorStatus: DashboardCreatorStatus | null,
  profileBalance: DashboardDetailProps["profileBalance"]
): {
  title: string;
  body: string;
} {
  if (project.lifecycle_status === "teaser") {
    return {
      title: "No commerce attached yet",
      body: "Teasers are for taste and signal. Convert this project when you are ready to add preorder or production rules.",
    };
  }

  if (profileBalance.availableBalanceCents > 0) {
    return {
      title: "Funds are already available",
      body: `${formatPrice(profileBalance.availableBalanceCents)} is available now. ${formatPrice(profileBalance.heldBalanceCents)} remains held until the remaining payout rules clear.`,
    };
  }

  if (profileBalance.heldBalanceCents > 0) {
    return creatorStatus?.trust.verifiedDelivery
      ? {
          title: "Some creator share is still held",
          body: `${formatPrice(profileBalance.heldBalanceCents)} is still waiting on delivery or release timing. Your proven-creator tier can unlock part of funds earlier on qualifying projects.`,
        }
      : {
          title: "You are on the new-creator payout tier",
          body: `${formatPrice(profileBalance.heldBalanceCents)} is still held. New creators unlock preorder funds after delivery.`,
        };
  }

  if (project.launch_mode === "production" || project.lifecycle_status === "in_production") {
    return {
      title: "Preorders can keep growing during production",
      body: "Use updates and delivery timing to keep the project trustworthy while the audience signal is still visible.",
    };
  }

  if (project.lifecycle_status === "released" || project.lifecycle_status === "premiering") {
    return {
      title: "Release revenue follows the review window",
      body: "Finished-film sales clear after the release review path. Your balances update automatically when funds become available.",
    };
  }

  return {
    title: "No payout available yet",
    body: "Once the project starts monetizing and clears its payout rules, your creator share will show up here automatically.",
  };
}

/* -- Main component -- */

interface DashboardDetailProps {
  project: DashboardProject;
  creatorStatus: DashboardCreatorStatus | null;
  recentUpdates: DashboardUpdate[];
  discussion: DashboardDiscussionStats;
  preordersToday: number;
  preordersThisWeek: number;
  premiere: DashboardPremiere | null;
  profileBalance: {
    availableBalanceCents: number;
    heldBalanceCents: number;
    deliveredProjectCount: number;
  };
  accountHealth: {
    creatorGoodStanding: boolean;
    strikeCount: number;
    activeFlags: number;
    stripeReady: boolean;
  };
  onBack: () => void;
}

export function DashboardDetail({
  project,
  creatorStatus,
  recentUpdates,
  discussion,
  preordersToday,
  preordersThisWeek,
  premiere,
  profileBalance,
  accountHealth,
  onBack,
}: DashboardDetailProps) {
  const router = useRouter();

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState(project.production_progress ?? 0);

  // Progress confirmation modal
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [pendingStage, setPendingStage] = useState<number>(0);
  const [progressNote, setProgressNote] = useState("");
  const [progressMediaId, setProgressMediaId] = useState("");
  const [progressMediaType, setProgressMediaType] = useState<"text" | "image" | "video">("text");

  // Estimated delivery date
  const [localEstDelivery, setLocalEstDelivery] = useState(
    project.estimated_delivery_at ? project.estimated_delivery_at.split("T")[0] : ""
  );

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateType, setUpdateType] = useState<"text" | "image" | "video">("text");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateBody, setUpdateBody] = useState("");
  const [updateMediaAssetId, setUpdateMediaAssetId] = useState("");

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [makeFreeModalOpen, setMakeFreeModalOpen] = useState(false);
  const [filmVideoId, setFilmVideoId] = useState("");
  const [filmBunnyId, setFilmBunnyId] = useState("");
  const [filmRegistering, setFilmRegistering] = useState(false);
  const [confirmFinalCut, setConfirmFinalCut] = useState(false);
  const [deliveryReleasePriceCents, setDeliveryReleasePriceCents] = useState(
    project.release_price_cents ?? 0
  );

  // Series delivery state
  const isSeries = project.format === "series" && (project.episode_count ?? 0) >= 2;
  const [episodes, setEpisodes] = useState<Array<{
    episodeNumber: number;
    title: string;
    videoId: string | null;
    bunnyId: string | null;
    registering: boolean;
    premiereDate: string;
  }>>([]);
  const [premiereCadence, setPremiereCadence] = useState<"weekly" | "biweekly">("weekly");
  const [premiereStartDate, setPremiereStartDate] = useState("");

  // Initialize episode slots when delivery modal opens for a series
  function initEpisodes() {
    if (isSeries && episodes.length === 0) {
      setEpisodes(
        Array.from({ length: project.episode_count! }, (_, i) => ({
          episodeNumber: i + 1,
          title: "",
          videoId: null,
          bunnyId: null,
          registering: false,
          premiereDate: "",
        }))
      );
    }
  }

  function recalcPremiereDates(startDate: string, cadence: "weekly" | "biweekly") {
    if (!startDate) return;
    const intervalDays = cadence === "weekly" ? 7 : 14;
    const start = new Date(startDate);
    setEpisodes((prev) =>
      prev.map((ep, i) => ({
        ...ep,
        premiereDate: new Date(start.getTime() + i * intervalDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16),
      }))
    );
  }

  function updateEpisode(index: number, updates: Partial<typeof episodes[number]>) {
    setEpisodes((prev) => prev.map((ep, i) => (i === index ? { ...ep, ...updates } : ep)));
  }

  async function handleEpisodeUploaded(index: number, bunnyVideoId: string) {
    updateEpisode(index, { bunnyId: bunnyVideoId, registering: true });
    try {
      const res = await fetch(`/api/projects/${project.id}/upload-film`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bunny_video_id: bunnyVideoId }),
      });
      const data = (await res.json().catch(() => ({}))) as { videoId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to register video");
      updateEpisode(index, { videoId: data.videoId ?? null, registering: false });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to register episode video");
      updateEpisode(index, { registering: false });
    }
  }

  const allEpisodesReady = episodes.length > 0 &&
    episodes.every((ep) => ep.videoId && ep.title.trim() && ep.premiereDate);
  const anyEpisodeRegistering = episodes.some((ep) => ep.registering);

  const [premiereModalOpen, setPremiereModalOpen] = useState(false);
  const [premiereDate, setPremiereDate] = useState("");
  const [premiereTime, setPremiereTime] = useState("");
  const [premiereSubmitting, setPremiereSubmitting] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<"preorder" | "production">("preorder");
  const [convertPreorderPrice, setConvertPreorderPrice] = useState(
    ((project.preorder_price_cents ?? 500) / 100).toFixed(2)
  );
  const [convertReleasePrice, setConvertReleasePrice] = useState(
    ((project.release_price_cents ?? project.preorder_price_cents ?? 500) / 100).toFixed(2)
  );
  const [convertUnlockTarget, setConvertUnlockTarget] = useState(String(project.unlock_target ?? 300));
  const [convertCampaignDuration, setConvertCampaignDuration] = useState("21");
  const [convertProductionWindow, setConvertProductionWindow] = useState(String(project.production_window_days ?? 60));

  const [greenlightConfirmOpen, setGreenlightConfirmOpen] = useState(false);

  const grossRevenueCents = project.ledger_revenue_cents;
  const creatorShareCents = Math.round(
    grossRevenueCents * (1 - project.platform_fee_rate)
  );
  const isTeaserProject = project.lifecycle_status === "teaser";
  const hasCampaignTarget = project.launch_mode === "preorder";
  const supportsPreorderStats =
    project.launch_mode === "preorder" || project.launch_mode === "production";
  const launchActionLabel =
    project.launch_mode === "teaser"
      ? "Post Teaser"
      : project.launch_mode === "production"
        ? "Launch Project"
        : "Launch Campaign";
  const preorderPriceFloorApplies = supportsPreorderStats;
  const isFreeRelease =
    project.release_option === "free" ||
    isFreeWatchProject(project.lifecycle_status, project.release_price_cents);

  const progressPercent = project.unlock_target
    ? Math.max(0, Math.min(100, Math.round((project.preorder_count_cache / project.unlock_target) * 100)))
    : 0;
  const fullProgressStates: ProjectLifecycleStatus[] = ["in_production", "premiering", "released"];
  const displayProgress = fullProgressStates.includes(project.lifecycle_status) ? 100 : progressPercent;

  const delivery = deliveryState(project);
  const deliveryToneClass =
    delivery.tone === "green" ? "text-role-success-fg"
    : delivery.tone === "amber" ? "text-role-warning-fg"
    : delivery.tone === "red" ? "text-role-danger-fg"
    : "text-text-tertiary";
  const creatorDeliverySummary = creatorStatus
    ? formatCreatorDeliverySummary(creatorStatus.trust)
    : "Creator status pending";
  const feeSummary = getCreatorFeeSummary(creatorStatus);
  const payoutContext = getPayoutContextCopy(project, creatorStatus, profileBalance);
  const hasHealthIssue =
    !accountHealth.creatorGoodStanding ||
    accountHealth.strikeCount > 0 ||
    accountHealth.activeFlags > 0 ||
    !accountHealth.stripeReady;
  const showMomentumCard =
    isTeaserProject ||
    project.lifecycle_status === "unlocking" ||
    project.lifecycle_status === "in_production" ||
    project.lifecycle_status === "premiering" ||
    project.lifecycle_status === "failed_to_unlock";
  const showUpdatesList = !["draft", "teaser", "unlocking"].includes(project.lifecycle_status);

  async function runAction<T>(key: string, action: () => Promise<T>) {
    setPendingKey(key);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingKey(null);
    }
  }

  async function launchCampaign() {
    await runAction("submit", async () => {
      const response = await fetch(`/api/projects/${project.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rights_attested: true, terms_version: "v1.0" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Could not ${launchActionLabel.toLowerCase()}`);
      setSuccessMessage(
        project.launch_mode === "teaser"
          ? "Teaser posted! Your project is now live."
          : project.launch_mode === "production"
          ? "Project launched! It is now in production and open for preorders."
          : "Campaign launched! Your project is live."
      );
    });
  }

  async function convertTeaser() {
    await runAction("convert", async () => {
      const payload: Record<string, unknown> = {
        target_launch_mode: convertTarget,
        preorder_price_cents: Math.round(parseFloat(convertPreorderPrice || "0") * 100),
        release_price_cents: Math.round(parseFloat(convertReleasePrice || "0") * 100),
        production_window_days: Number(convertProductionWindow),
      };

      if (convertTarget === "preorder") {
        payload.unlock_target = Number(convertUnlockTarget);
        payload.campaign_duration_days = Number(convertCampaignDuration);
      }

      const response = await fetch(`/api/projects/${project.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not convert teaser");
      }
      setConvertModalOpen(false);
      setSuccessMessage(
        convertTarget === "production"
          ? "Teaser converted. Your project is now in production and open for preorders."
          : "Teaser converted. Your preorder campaign is now live."
      );
    });
  }


  async function greenlightProject() {
    await runAction("greenlight", async () => {
      const response = await fetch(`/api/projects/${project.id}/greenlight`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not approve project");
      setSuccessMessage("Project approved! Production has started.");
    });
  }

  async function postUpdate() {
    await runAction("post-update", async () => {
      const response = await fetch(`/api/projects/${project.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          update_type: updateType,
          title: updateTitle.trim() || null,
          body: updateBody.trim() || null,
          media_asset_id: updateMediaAssetId.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not post update");
      setUpdateModalOpen(false);
      setUpdateTitle("");
      setUpdateBody("");
      setUpdateMediaAssetId("");
      setUpdateType("text");
      setSuccessMessage("Update posted.");
    });
  }

  async function handleFilmUploaded(bunnyVideoId: string) {
    setFilmRegistering(true);
    setFilmBunnyId(bunnyVideoId);
    try {
      const res = await fetch(`/api/projects/${project.id}/upload-film`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bunny_video_id: bunnyVideoId }),
      });
      const data = (await res.json().catch(() => ({}))) as { videoId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to register video");
      setFilmVideoId(data.videoId ?? "");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to register video");
    } finally {
      setFilmRegistering(false);
    }
  }

  async function deliverFilm() {
    await runAction("deliver", async () => {
      const body: Record<string, unknown> = {};

      if (isSeries) {
        // Series delivery — send episodes array
        body.episodes = episodes.map((ep) => ({
          episode_number: ep.episodeNumber,
          title: ep.title.trim(),
          video_id: ep.videoId,
          premiere_scheduled_at: new Date(ep.premiereDate).toISOString(),
        }));
        body.film_video_id = episodes[0]?.videoId; // first episode as fallback
      } else {
        body.film_video_id = filmVideoId.trim();
      }

      // Include release price if changed
      if (deliveryReleasePriceCents !== project.release_price_cents) {
        body.release_price_cents = deliveryReleasePriceCents;
      }
      const response = await fetch(`/api/projects/${project.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not deliver film");
      const wasReplacement = project.lifecycle_status === "premiering";

      // Auto-schedule premiere if date was set in delivery modal (non-series only)
      let premiereScheduled = false;
      if (!wasReplacement && !isSeries && premiereDate && premiereTime) {
        try {
          const dt = new Date(`${premiereDate}T${premiereTime}`);
          const premiereRes = await fetch(`/api/projects/${project.id}/premiere`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ premiere_at: dt.toISOString() }),
          });
          if (premiereRes.ok) premiereScheduled = true;
        } catch {
          // Premiere scheduling failed but delivery succeeded — not critical
        }
      }

      setDeliveryModalOpen(false);
      setFilmVideoId("");
      setFilmBunnyId("");
      setConfirmFinalCut(false);
      setEpisodes([]);
      setPremiereStartDate("");
      setPremiereDate("");
      setPremiereTime("");
      setSuccessMessage(
        wasReplacement
          ? "Film replaced successfully."
          : isSeries
            ? "Series delivered! Episodes will premiere on your scheduled dates."
            : premiereScheduled
              ? "Film delivered and premiere scheduled!"
              : "Film delivered! You can schedule a premiere from the dashboard."
      );
    });
  }

  async function makeFilmFree() {
    await runAction("make-free", async () => {
      const response = await fetch(`/api/projects/${project.id}/make-free`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not make film free");
      setMakeFreeModalOpen(false);
      setSuccessMessage("Film is now free to watch.");
    });
  }

  async function copyProjectLink() {
    if (!project.slug) return;
    try {
      await navigator.clipboard.writeText(`https://myriadspring.com/project/${project.slug}`);
      setSuccessMessage("Project link copied.");
    } catch {
      setErrorMessage("Could not copy project link");
    }
  }

  // Price validation for delivery modal
  const priceValid =
    deliveryReleasePriceCents >= 300 &&
    deliveryReleasePriceCents <= 20000 &&
    (!preorderPriceFloorApplies || deliveryReleasePriceCents >= (project.preorder_price_cents ?? 0));

  return (
    <div className="brand-halo-bg mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        All Projects
      </button>

      {/* Alerts */}
      {errorMessage ? (
        <div className="rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-sm text-role-danger-fg">{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className="rounded-lg border border-role-success-border bg-role-success-bg px-3 py-2 text-sm text-role-success-fg">{successMessage}</div>
      ) : null}

      <Card className="overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(245,158,11,0.14),transparent_20%),linear-gradient(180deg,rgba(8,14,12,0.98)_0%,rgba(5,8,10,1)_100%)]">
        <CardContent className="space-y-6 p-6 sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">Owner view</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-3xl font-bold text-white">{project.title}</h2>
                <LifecycleBadge status={project.lifecycle_status} />
                {project.moderation_status !== "live" ? (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${moderationBadgeClass(project.moderation_status)}`}>
                    {project.moderation_status.replaceAll("_", " ")}
                  </span>
                ) : null}
                {creatorStatus ? <CreatorTrustBadges trust={creatorStatus.trust} size="md" /> : null}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
                {creatorDeliverySummary}. {feeSummary.body} {payoutContext.body}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Launch state</p>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {project.lifecycle_status === "teaser"
                      ? "Teaser live"
                      : project.launch_mode === "production"
                        ? "Preorders open during production"
                        : project.lifecycle_status === "draft"
                          ? "Draft project"
                          : project.lifecycle_status === "released"
                            ? "Release is live"
                            : `Next: ${launchActionLabel}`}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Timeline</p>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {project.lifecycle_status === "teaser"
                      ? `${formatCount(project.save_count_cache)} saves`
                      : project.lifecycle_status === "unlocking"
                        ? `Deadline ${formatDate(project.campaign_ends_at)}`
                        : `Delivery ${formatDate(project.delivery_deadline ?? project.estimated_delivery_at)}`}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                    {project.lifecycle_status === "teaser" ? "Audience signal" : "Premiere state"}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {project.lifecycle_status === "teaser"
                      ? `${formatCount(project.discussion_count_cache)} discussion · ${formatCount(project.like_count_cache)} likes`
                      : premiere?.is_premiere_live
                        ? "Live now"
                        : premiere?.premiere_scheduled_at
                          ? `Scheduled ${formatDate(premiere.premiere_scheduled_at)}`
                          : project.delivered_at
                            ? "Ready to schedule"
                            : "No premiere yet"}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Money snapshot</p>
                  <p className="mt-2 text-sm font-semibold text-white">{feeSummary.label}</p>
                </div>
                <Wallet size={18} className="text-brand-300" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <p className="text-xs text-white/55">Available</p>
                  <p className="mt-2 text-xl font-semibold text-white">{formatPrice(profileBalance.availableBalanceCents)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <p className="text-xs text-white/55">Held</p>
                  <p className="mt-2 text-xl font-semibold text-white">{formatPrice(profileBalance.heldBalanceCents)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/72">
                <p className="font-medium text-white">{payoutContext.title}</p>
                <p className="mt-2 leading-6">{payoutContext.body}</p>
              </div>
            </div>
          </div>

          {(["flagged", "rejected", "suspended"] as ProjectModerationStatus[]).includes(project.moderation_status) ? (
            <div className="rounded-2xl border border-role-danger-border bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">
              This project has moderation issues. Fix those before you spend energy on the rest of the dashboard.
            </div>
          ) : null}

          {project.lifecycle_status === "unlocking" && (project.unlock_target ?? 0) > 0 && project.preorder_count_cache >= Math.ceil((project.unlock_target ?? 1) * 0.5) ? (() => {
            const hasWindow = project.manual_greenlight_eligible && project.grace_period_end;
            const hoursLeft = hasWindow ? Math.max(0, Math.round((new Date(project.grace_period_end!).getTime() - Date.now()) / (1000 * 60 * 60))) : null;
            return (
              <div className={`rounded-lg border p-4 ${hasWindow ? "border-amber-500/40 bg-amber-500/10" : "border-role-success-border bg-role-success-bg"}`}>
                <h4 className={`font-semibold ${hasWindow ? "text-amber-200" : "text-role-success-fg"}`}>
                  {hasWindow ? `${hoursLeft}h left to approve your project` : "Your project reached 50%+"}
                </h4>
                <p className="mt-1 text-sm text-text-secondary">
                  {hasWindow
                    ? "Your campaign ended but you reached 50%+ of your target. Approve now to start production, or it will be cancelled and all preorders refunded."
                    : "You can approve your project now to start production, or wait for more preorders."}
                </p>
                <Button className="mt-3 w-full" onClick={() => setGreenlightConfirmOpen(true)} disabled={pendingKey === "greenlight"}>
                  Approve &amp; Start Production
                </Button>
              </div>
            );
          })() : null}

          {project.is_overdue ? (
            <div className="rounded-2xl border border-role-danger-border bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">
              This project is overdue. Delivery timing is now the main trust risk.
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Clock3 size={16} className="text-brand-300" />
              Action rail
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/project/${project.slug ?? project.id}`}>
                <Button>View Project Page</Button>
              </Link>

              {project.slug ? (
                <Button variant="secondary" onClick={() => void copyProjectLink()}>
                  <Copy size={14} />
                  Copy Link
                </Button>
              ) : null}

              {project.lifecycle_status === "draft" ? (
                <>
                  <Link href={`/projects/new?edit=${project.id}`}>
                    <Button variant="secondary">Edit Project</Button>
                  </Link>
                  <Button onClick={() => void launchCampaign()} disabled={pendingKey === "submit"}>
                    {pendingKey === "submit" ? <Loader2 size={14} className="animate-spin" /> : null}
                    {project.moderation_status === "live" ? "Live" : launchActionLabel}
                  </Button>
                </>
              ) : null}

              {project.lifecycle_status === "unlocking" ? (
                <>
                  <Link href={`/projects/new?edit=${project.id}`}>
                    <Button variant="secondary">Edit Project</Button>
                  </Link>
                  {project.manual_greenlight_eligible ? (
                    <Button onClick={() => setGreenlightConfirmOpen(true)} disabled={pendingKey === "greenlight"}>
                      Approve &amp; Start Production
                    </Button>
                  ) : null}
                </>
              ) : null}

              {project.lifecycle_status === "in_production" ? (
                <>
                  <Link href={`/projects/new?edit=${project.id}`}>
                    <Button variant="secondary">Edit Project</Button>
                  </Link>
                  <Button variant="secondary" onClick={() => setUpdateModalOpen(true)}>
                    Post Update
                  </Button>
                  <Button
                    onClick={() => {
                      initEpisodes();
                      setDeliveryModalOpen(true);
                    }}
                    disabled={localProgress < 100}
                  >
                    {isSeries ? "Deliver Series" : "Deliver Film"}
                  </Button>
                </>
              ) : null}

              {project.lifecycle_status === "premiering" ? (
                <>
                  {project.film_video_id ? (
                    <Link href={`/watch/${project.film_video_id}`}>
                      <Button variant="secondary">
                        <Video size={14} />
                        Watch Page
                      </Button>
                    </Link>
                  ) : null}
                  <Button onClick={() => setPremiereModalOpen(true)} disabled={!project.film_video_id}>
                    {premiere?.premiere_scheduled_at && !premiere.premiere_ended ? "Edit Premiere" : "Schedule Premiere"}
                  </Button>
                  {!premiere?.is_premiere_live && !premiere?.premiere_ended ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        initEpisodes();
                        setDeliveryModalOpen(true);
                      }}
                    >
                      Replace Film
                    </Button>
                  ) : null}
                </>
              ) : null}

              {project.lifecycle_status === "released" ? (
                <>
                  {project.film_video_id ? (
                    <Link href={`/watch/${project.film_video_id}`}>
                      <Button variant="secondary">
                        <Video size={14} />
                        Watch Page
                      </Button>
                    </Link>
                  ) : null}
                  {isFreeRelease ? (
                    <Button variant="secondary" disabled>
                      Free to Watch
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={pendingKey === "make-free"}
                      onClick={() => setMakeFreeModalOpen(true)}
                    >
                      Make Free
                    </Button>
                  )}
                </>
              ) : null}

              {project.lifecycle_status === "teaser" ? (
                <>
                  <Link href={`/projects/new?edit=${project.id}`}>
                    <Button variant="secondary">Edit Project</Button>
                  </Link>
                  <Button
                    onClick={() => {
                      setConvertTarget("preorder");
                      setConvertModalOpen(true);
                    }}
                    disabled={pendingKey === "convert"}
                  >
                    Convert to Campaign
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setConvertTarget("production");
                      setConvertModalOpen(true);
                    }}
                    disabled={pendingKey === "convert"}
                  >
                    Start Production
                  </Button>
                </>
              ) : null}

              {project.lifecycle_status === "failed_to_unlock" ? (
                <Link href={`/projects/new?edit=${project.id}`}>
                  <Button>Edit &amp; Relaunch</Button>
                </Link>
              ) : null}
            </div>
          </div>

          {project.lifecycle_status === "in_production" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_380px]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <TrendingUp size={16} className="text-brand-300" />
                  Production progress
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-purple-400 transition-all duration-300"
                    style={{ width: `${Math.max(localProgress, pendingStage > localProgress ? pendingStage : 0)}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {[25, 50, 75, 100].filter((value) => value > localProgress).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPendingStage(value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        pendingStage === value
                          ? "border-purple-400 bg-purple-400/20 text-purple-200"
                          : "border-white/10 bg-black/20 text-white/65 hover:border-purple-400/35 hover:text-white"
                      }`}
                    >
                      {value === 100 ? "Done" : `${value}%`}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1">
                    <input
                      type="number"
                      min={localProgress + 1}
                      max={100}
                      value={pendingStage > localProgress ? pendingStage : ""}
                      placeholder={`${localProgress + 1}`}
                      onChange={(event) => {
                        const value = Math.min(100, Math.max(localProgress + 1, Number(event.target.value) || 0));
                        setPendingStage(value);
                      }}
                      className="w-16 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-center text-xs font-semibold text-white outline-none focus:border-purple-400"
                    />
                    <span className="text-xs text-white/55">%</span>
                  </div>
                </div>
                {pendingStage > localProgress && localProgress < 100 ? (
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setProgressNote(`Production progress updated to ${pendingStage === 100 ? "Done" : `${pendingStage}%`}.`);
                      setProgressMediaId("");
                      setProgressMediaType("text");
                      setProgressModalOpen(true);
                    }}
                  >
                    Update to {pendingStage === 100 ? "Done" : `${pendingStage}%`}
                  </Button>
                ) : (
                  <p className="mt-4 text-sm text-white/70">
                    {localProgress >= 100 ? "Production is marked complete." : `${localProgress}% complete right now.`}
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <CheckCircle2 size={16} className="text-brand-300" />
                  Release flow
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/72">
                  <p>Delivery deadline: <span className="text-white">{formatDate(project.delivery_deadline ?? project.estimated_delivery_at)}</span></p>
                  <p>Production window: <span className="text-white">{project.production_window_days ?? "—"} days</span></p>
                  <p className={deliveryToneClass}>Status: {delivery.label}</p>
                </div>
                {project.delivery_deadline ? (
                  <div className="mt-4 space-y-2">
                    <label className="block text-xs font-medium uppercase tracking-[0.18em] text-white/55">
                      Estimated delivery for backers
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={localEstDelivery}
                        min={new Date().toISOString().split("T")[0]}
                        max={project.delivery_deadline.split("T")[0]}
                        onChange={(event) => setLocalEstDelivery(event.target.value)}
                        className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pendingKey === "est-delivery" || !localEstDelivery}
                        onClick={async () => {
                          setPendingKey("est-delivery");
                          setErrorMessage(null);
                          try {
                            const response = await fetch(`/api/projects/${project.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ estimated_delivery_at: new Date(localEstDelivery).toISOString() }),
                            });
                            if (!response.ok) {
                              const data = await response.json();
                              setErrorMessage(data.error ?? "Failed to update delivery date");
                            } else {
                              setSuccessMessage("Estimated delivery date updated");
                            }
                          } catch {
                            setErrorMessage("Network error");
                          } finally {
                            setPendingKey(null);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : null}
                {localProgress < 100 ? (
                  <p className="mt-4 text-xs text-white/55">Set production progress to Done before delivering.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {(project.lifecycle_status === "premiering" || project.lifecycle_status === "released") ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Premiere state</p>
                  <p className="mt-1 text-sm text-white/72">
                    {premiere?.is_premiere_live
                      ? "The premiere is live right now."
                      : premiere?.premiere_scheduled_at && !premiere.premiere_ended
                        ? `Scheduled for ${formatDate(premiere.premiere_scheduled_at)}`
                        : "No premiere is currently scheduled."}
                  </p>
                </div>
                {!premiere?.is_premiere_live && premiere?.premiere_scheduled_at && !premiere.premiere_ended ? (
                  <Button
                    variant="secondary"
                    disabled={pendingKey === "cancel-premiere"}
                    onClick={async () => {
                      setPendingKey("cancel-premiere");
                      setErrorMessage(null);
                      try {
                        const response = await fetch(`/api/projects/${project.id}/premiere`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ cancel: true }),
                        });
                        if (!response.ok) throw new Error("Failed to cancel premiere");
                        setSuccessMessage("Premiere cancelled");
                        router.refresh();
                      } catch {
                        setErrorMessage("Failed to cancel premiere");
                      } finally {
                        setPendingKey(null);
                      }
                    }}
                  >
                    {pendingKey === "cancel-premiere" ? <Loader2 size={14} className="animate-spin" /> : null}
                    Cancel Premiere
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${showMomentumCard ? "xl:grid-cols-[minmax(0,1.05fr)_420px]" : ""}`}>
        {showMomentumCard ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {isTeaserProject ? <TrendingUp size={16} className="text-role-brand-fg" /> : <Megaphone size={16} className="text-role-brand-fg" />}
                <h2 className="font-display text-lg font-semibold text-text-primary">Momentum</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTeaserProject ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] p-4">
                    <Sparkles size={20} className="shrink-0 text-brand-400" />
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        {formatCount(project.like_count_cache + project.save_count_cache)} {(project.like_count_cache + project.save_count_cache) === 1 ? "person" : "people"} want this made
                      </p>
                      <p className="mt-0.5 text-xs text-text-tertiary">Likes + saves from your teaser page</p>
                    </div>
                  </div>
                  <div className="divide-y divide-role-border-subtle rounded-2xl border border-role-border-subtle bg-role-bg-surface px-3 py-1">
                    <MetricRow label="Likes" value={project.like_count_cache} />
                    <MetricRow label="Discussion posts" value={project.discussion_count_cache} />
                    <MetricRow label="Saves" value={project.save_count_cache} />
                  </div>
                  {(project.like_count_cache + project.save_count_cache) >= 10 ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setConvertTarget("preorder");
                        setConvertModalOpen(true);
                      }}
                      disabled={pendingKey === "convert"}
                    >
                      Convert to Seed Campaign
                    </Button>
                  ) : (
                    <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-secondary">
                      <p className="font-medium text-text-primary">Teaser signal only</p>
                      <p className="mt-2 leading-6">
                        This page is doing the right job if it tells you whether the world, hook, and tone deserve a real launch. Convert it when the pitch is ready for commerce.
                      </p>
                    </div>
                  )}
                </>
              ) : project.lifecycle_status === "unlocking" || project.lifecycle_status === "in_production" || project.lifecycle_status === "failed_to_unlock" ? (
                <>
                  <div>
                    <p className="text-3xl font-semibold text-text-primary">
                      {hasCampaignTarget
                        ? `${project.preorder_count_cache} / ${project.unlock_target ?? "—"}`
                        : `${project.preorder_count_cache.toLocaleString()} preorders`}
                    </p>
                    <p className="mt-1 text-sm text-text-tertiary">
                      {hasCampaignTarget ? "Preorders against your unlock target" : "Preorders collected so far"}
                    </p>
                  </div>
                  {hasCampaignTarget ? (
                    <div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-role-cta-bg shadow-[0_0_10px_var(--role-glow-soft)] transition-all duration-500"
                          style={{ width: `${displayProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-text-tertiary">{displayProgress}% complete</p>
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-role-border-subtle bg-page p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Today</p>
                      <p className="mt-3 text-2xl font-semibold text-text-primary">{preordersToday}</p>
                    </div>
                    <div className="rounded-2xl border border-role-border-subtle bg-page p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">This week</p>
                      <p className="mt-3 text-2xl font-semibold text-text-primary">{preordersThisWeek}</p>
                    </div>
                  </div>
                  {project.slug ? (
                    <Button variant="secondary" onClick={() => void copyProjectLink()}>
                      <Copy size={14} />
                      Copy project link
                    </Button>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-secondary">
                  <p className="font-medium text-text-primary">Premiere momentum</p>
                  <p className="mt-2 leading-6">
                    {premiere?.is_premiere_live
                      ? "The social job is getting viewers into the live watch surface right now."
                      : premiere?.premiere_scheduled_at
                        ? `The next public beat is the scheduled premiere on ${formatDate(premiere.premiere_scheduled_at)}.`
                        : "The film is delivered, but the public event still needs scheduling."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-role-brand-fg" />
              <h2 className="font-display text-lg font-semibold text-text-primary">Money</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTeaserProject ? (
              <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-secondary">
                <p className="font-medium text-text-primary">Commerce starts after conversion</p>
                <p className="mt-2 leading-6">
                  Your current fee and payout tier still matter, but this teaser does not create orders or unlock balances until you convert it into a campaign or production project.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-tertiary">Gross revenue</p>
                  <p className="text-sm font-medium text-text-primary">{formatPrice(grossRevenueCents)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-tertiary">Platform fee ({formatFeeRate(project.platform_fee_rate)})</p>
                  <p className="text-sm text-text-tertiary">−{formatPrice(grossRevenueCents - creatorShareCents)}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm font-medium text-text-primary">Project creator share</p>
                  <p className="text-lg font-semibold text-role-success-fg">{formatPrice(creatorShareCents)}</p>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-role-border-subtle bg-page p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Current fee</p>
                <p className="mt-3 text-2xl font-semibold text-text-primary">
                  {creatorStatus ? formatFeeRate(creatorStatus.platformFeeRate) : "—"}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{feeSummary.body}</p>
              </div>
              <div className="rounded-2xl border border-role-border-subtle bg-page p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Available / held</p>
                <p className="mt-3 text-2xl font-semibold text-text-primary">
                  {formatPrice(profileBalance.availableBalanceCents)} / {formatPrice(profileBalance.heldBalanceCents)}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{payoutContext.title}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-role-border-subtle bg-page p-4 text-sm text-text-secondary">
              <div className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-1 shrink-0 text-role-brand-fg" />
                <div>
                  <p className="font-medium text-text-primary">Creator payout context</p>
                  <p className="mt-2 leading-6">{payoutContext.body}</p>
                </div>
              </div>
            </div>

            {!accountHealth.stripeReady ? (
              <div className="rounded-2xl border border-role-warning-border bg-role-warning-bg p-4">
                <p className="text-sm font-medium text-role-warning-fg">Stripe is not connected</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Launches can still move, but withdrawals stay blocked until Stripe onboarding is complete.
                </p>
                <div className="mt-3">
                  <StripeConnectButton variant="secondary" size="sm">
                    Connect Stripe
                  </StripeConnectButton>
                </div>
              </div>
            ) : null}

            {hasHealthIssue ? (
              <div className="rounded-2xl border border-role-border-subtle bg-page p-4 text-sm text-text-secondary">
                <p className="font-medium text-text-primary">Account signals</p>
                <div className="mt-3 divide-y divide-role-border-subtle rounded-xl border border-role-border-subtle bg-role-bg-surface px-3 py-1">
                  <MetricRow label="Creator standing" value={accountHealth.creatorGoodStanding ? "Good" : "Needs attention"} tone={accountHealth.creatorGoodStanding ? "default" : "warning"} />
                  <MetricRow label="Strike count" value={accountHealth.strikeCount} tone={accountHealth.strikeCount > 0 ? "warning" : "default"} />
                  <MetricRow label="Active flags" value={accountHealth.activeFlags} tone={accountHealth.activeFlags > 0 ? "danger" : "default"} />
                  <MetricRow label="Stripe payouts" value={accountHealth.stripeReady ? "Connected" : "Not connected"} tone={accountHealth.stripeReady ? "success" : "warning"} />
                </div>
              </div>
            ) : null}

            <p className="text-xs text-text-tertiary">
              Full payout history lives in{" "}
              <Link href="/dashboard?tab=earnings" className="text-text-secondary underline hover:text-text-primary">
                the Earnings tab
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Megaphone size={16} className="text-role-brand-fg" />
          Collaboration
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold text-text-primary">Updates</h2>
            </CardHeader>
            <CardContent>
              {!showUpdatesList ? (
                <p className="text-sm text-text-tertiary">
                  Updates start mattering once the project is beyond teaser and prelaunch setup.
                </p>
              ) : recentUpdates.length === 0 ? (
                <p className="text-sm text-text-tertiary">No updates posted yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentUpdates.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-surface p-3">
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        {updateIcon(item.update_type)}
                        <span className="font-medium text-text-primary">{item.title || "Untitled update"}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-text-tertiary">{formatDate(item.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold text-text-primary">Discussion</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-text-secondary">
                <p>Total posts: {discussion.totalPosts}</p>
                <p>New this week: {discussion.newThisWeek}</p>
                <p>Unanswered: {discussion.unanswered}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/project/${project.slug ?? project.id}?tab=discussion`}>
                  <Button variant="secondary">
                    <MessageSquare size={14} />
                    Open Discussion
                  </Button>
                </Link>
                {discussion.unanswered > 0 ? (
                  <Link href={`/project/${project.slug ?? project.id}?tab=discussion`}>
                    <Button variant="ghost">Reply to {discussion.unanswered} unanswered</Button>
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <ProjectTeamPanel projectId={project.id} isOwner />
      </section>

      <Modal open={convertModalOpen} onClose={() => setConvertModalOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-text-primary">
            {convertTarget === "production" ? "Start Production" : "Convert to Seed Campaign"}
          </h3>
          <p className="text-sm text-text-secondary">
            This keeps the same project page, slug, likes, saves, and discussion. You are only adding the real launch rules now.
          </p>

          <Select
            label="Conversion mode"
            value={convertTarget}
            onChange={(event) => setConvertTarget(event.target.value as "preorder" | "production")}
            options={[
              { value: "preorder", label: "Seed Campaign" },
              { value: "production", label: "Direct to Production" },
            ]}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Preorder price ($)"
              type="number"
              min={3}
              max={100}
              step={0.01}
              value={convertPreorderPrice}
              onChange={(event) => setConvertPreorderPrice(event.target.value)}
            />
            <Input
              label="Release price ($)"
              type="number"
              min={3}
              max={200}
              step={0.01}
              value={convertReleasePrice}
              onChange={(event) => setConvertReleasePrice(event.target.value)}
            />
            {convertTarget === "preorder" ? (
              <Input
                label="Unlock target"
                type="number"
                min={50}
                max={2000}
                value={convertUnlockTarget}
                onChange={(event) => setConvertUnlockTarget(event.target.value)}
              />
            ) : null}
            {convertTarget === "preorder" ? (
              <Input
                label="Campaign duration (days)"
                type="number"
                min={21}
                max={180}
                value={convertCampaignDuration}
                onChange={(event) => setConvertCampaignDuration(event.target.value)}
              />
            ) : null}
            <Input
              label="Production window (days)"
              type="number"
              min={21}
              max={180}
              value={convertProductionWindow}
              onChange={(event) => setConvertProductionWindow(event.target.value)}
            />
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 text-xs text-text-tertiary space-y-1">
            <p>{convertTarget === "production" ? "Project will move directly into in production." : "Project will move into unlocking and start taking preorders immediately."}</p>
            <p>Stripe onboarding is required before conversion because the project becomes monetized.</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConvertModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void convertTeaser()} disabled={pendingKey === "convert"}>
              {pendingKey === "convert" ? <Loader2 size={14} className="animate-spin" /> : null}
              {convertTarget === "production" ? "Start Production" : "Convert Campaign"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* -- Progress Confirmation Modal -- */}
      <Modal open={progressModalOpen} onClose={() => setProgressModalOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-text-primary">
            Update progress to {pendingStage === 100 ? "Done" : `${pendingStage}%`}?
          </h3>
          <p className="text-sm text-text-secondary">
            This cannot be undone. Your project will show {pendingStage === 100 ? "100%" : `${pendingStage}%`} progress to all viewers.
          </p>

          <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
            <p className="text-xs font-medium text-text-secondary">Optional: post an update with this milestone</p>
            <Select
              label="Media type"
              value={progressMediaType}
              onChange={(e) => { setProgressMediaType(e.target.value as typeof progressMediaType); setProgressMediaId(""); }}
              options={[
                { value: "text", label: "Text only" },
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
              ]}
            />
            <Textarea
              label="Note (optional)"
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              rows={3}
              maxLength={2000}
            />
            {progressMediaType === "image" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Image</label>
                <ImageUpload bucket="thumbnails" currentUrl={progressMediaId || null} onUpload={(url) => setProgressMediaId(url)} aspectRatio="video" maxSizeMB={10} />
              </div>
            )}
            {progressMediaType === "video" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Video</label>
                <VideoUpload currentAssetId={progressMediaId || null} onUpload={(bunnyVideoId) => setProgressMediaId(bunnyVideoId)} title={`Progress: ${pendingStage}%`} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setProgressModalOpen(false)}>Cancel</Button>
            <Button
              variant="secondary"
              disabled={pendingKey === "progress"}
              onClick={async () => {
                setPendingKey("progress");
                setErrorMessage(null);
                try {
                  const res = await fetch(`/api/projects/${project.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ production_progress: pendingStage }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    setErrorMessage(data.error ?? "Failed to update progress");
                  } else {
                    setLocalProgress(pendingStage);
                    setSuccessMessage(`Progress updated to ${pendingStage === 100 ? "Done" : `${pendingStage}%`}`);
                    setProgressModalOpen(false);
                  }
                } catch {
                  setErrorMessage("Network error");
                } finally {
                  setPendingKey(null);
                }
              }}
            >
              {pendingKey === "progress" ? <Loader2 size={14} className="animate-spin" /> : null}
              Update Only
            </Button>
            <Button
              disabled={pendingKey === "progress" || (progressMediaType !== "text" && !progressMediaId.trim())}
              onClick={async () => {
                setPendingKey("progress");
                setErrorMessage(null);
                try {
                  // 1. Update progress
                  const res = await fetch(`/api/projects/${project.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ production_progress: pendingStage }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    setErrorMessage(data.error ?? "Failed to update progress");
                    return;
                  }
                  // 2. Post update
                  const updateRes = await fetch(`/api/projects/${project.id}/updates`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: `Production Progress: ${pendingStage === 100 ? "Done" : `${pendingStage}%`}`,
                      body: progressNote.trim() || null,
                      update_type: progressMediaType,
                      media_asset_id: progressMediaId.trim() || null,
                    }),
                  });
                  if (!updateRes.ok) {
                    // Progress saved but update failed — still update local state
                    setLocalProgress(pendingStage);
                    setErrorMessage("Progress saved, but update post failed");
                    setProgressModalOpen(false);
                    return;
                  }
                  setLocalProgress(pendingStage);
                  setSuccessMessage(`Progress updated to ${pendingStage === 100 ? "Done" : `${pendingStage}%`} — update posted`);
                  setProgressModalOpen(false);
                } catch {
                  setErrorMessage("Network error");
                } finally {
                  setPendingKey(null);
                }
              }}
            >
              {pendingKey === "progress" ? <Loader2 size={14} className="animate-spin" /> : null}
              Update &amp; Post
            </Button>
          </div>
        </div>
      </Modal>

      {/* -- Greenlight Confirm Modal -- */}
      {greenlightConfirmOpen && project.lifecycle_status === "unlocking" ? (
        <Modal open onClose={() => setGreenlightConfirmOpen(false)} title="Start Production">
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Preorders</span>
                <span className="font-medium">{project.preorder_count_cache} / {project.unlock_target ?? "\u2014"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Gross revenue</span>
                <span className="font-medium">{formatPrice(grossRevenueCents)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Platform fee ({Math.round(project.platform_fee_rate * 100)}%)
                </span>
                <span className="text-text-tertiary">&minus;{formatPrice(grossRevenueCents - creatorShareCents)}</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Your estimated earnings</span>
                <span className="font-bold text-role-success-fg">{formatPrice(creatorShareCents)}</span>
              </div>
            </div>
            <p className="text-xs text-text-tertiary">
              Your earnings will be available after you deliver your film. More preorders during production will increase your total.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setGreenlightConfirmOpen(false)}>Wait for more</Button>
              <Button className="flex-1" onClick={() => { setGreenlightConfirmOpen(false); void greenlightProject(); }} disabled={pendingKey === "greenlight"}>
                {pendingKey === "greenlight" ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm &amp; Start
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* -- Update Modal -- */}
      <Modal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-text-primary">Post Update</h3>
          <Select
            label="Update type"
            value={updateType}
            onChange={(e) => { setUpdateType(e.target.value as typeof updateType); setUpdateMediaAssetId(""); }}
            options={[
              { value: "text", label: "Text" },
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
            ]}
          />
          <Input label="Title" value={updateTitle} onChange={(e) => setUpdateTitle(e.target.value)} maxLength={100} />
          <Textarea label="Body" value={updateBody} onChange={(e) => setUpdateBody(e.target.value)} rows={5} maxLength={2000} />
          {updateType === "image" ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Update Image</label>
              <ImageUpload bucket="thumbnails" currentUrl={updateMediaAssetId || null} onUpload={(url) => setUpdateMediaAssetId(url)} aspectRatio="video" maxSizeMB={10} />
            </div>
          ) : null}
          {updateType === "video" ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Update Video</label>
              <VideoUpload currentAssetId={updateMediaAssetId || null} onUpload={(bunnyVideoId) => setUpdateMediaAssetId(bunnyVideoId)} title={updateTitle || "Project Update"} />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setUpdateModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void postUpdate()} disabled={pendingKey === "post-update" || (updateType !== "text" && !updateMediaAssetId.trim())}>
              {pendingKey === "post-update" ? <Loader2 size={14} className="animate-spin" /> : null}
              Post Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* -- Delivery Modal (with release price editing) -- */}
      <Modal open={deliveryModalOpen} onClose={() => { setDeliveryModalOpen(false); if (isSeries && episodes.length === 0) initEpisodes(); }}>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          <h3 className="font-display text-lg font-semibold text-text-primary">
            {isSeries ? `Deliver Series (${project.episode_count} Episodes)` : "Deliver Film"}
          </h3>

          {isSeries ? (
            <>
              {/* Episode upload slots */}
              <div className="space-y-3">
                {episodes.map((ep, idx) => (
                  <div key={ep.episodeNumber} className="rounded-lg border border-border bg-surface p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-500">
                        {ep.episodeNumber}
                      </span>
                      <span className="text-sm font-medium text-text-primary">Episode {ep.episodeNumber}</span>
                      {ep.videoId ? (
                        <span className="ml-auto text-xs text-role-success-fg">Ready</span>
                      ) : ep.registering ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-text-tertiary">
                          <Loader2 size={10} className="animate-spin" /> Registering...
                        </span>
                      ) : null}
                    </div>
                    <Input
                      label="Title"
                      value={ep.title}
                      onChange={(e) => updateEpisode(idx, { title: e.target.value })}
                      maxLength={200}
                      placeholder={`Episode ${ep.episodeNumber} title`}
                    />
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-text-secondary">Video</label>
                      <p className="text-xs text-text-tertiary">Final episode uploads support files up to {FULL_FILM_UPLOAD_MAX_MB / 1000} GB.</p>
                      <VideoUpload
                        currentAssetId={ep.bunnyId || null}
                        onUpload={(bunnyVideoId) => void handleEpisodeUploaded(idx, bunnyVideoId)}
                        title={ep.title || `${project.title} — Ep ${ep.episodeNumber}`}
                        maxSizeMB={FULL_FILM_UPLOAD_MAX_MB}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Premiere scheduling — shown after episodes */}
              <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
                <h4 className="text-sm font-semibold text-text-primary">Premiere Schedule</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-text-secondary">Start date</label>
                    <input
                      type="datetime-local"
                      value={premiereStartDate}
                      min={new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                      onChange={(e) => {
                        setPremiereStartDate(e.target.value);
                        recalcPremiereDates(e.target.value, premiereCadence);
                      }}
                      className="w-full rounded-lg border border-border bg-page py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <p className="text-xs text-text-tertiary">First episode premiere (min 48h from now)</p>
                  </div>
                  <Select
                    label="Cadence"
                    value={premiereCadence}
                    onChange={(e) => {
                      const c = e.target.value as "weekly" | "biweekly";
                      setPremiereCadence(c);
                      recalcPremiereDates(premiereStartDate, c);
                    }}
                    options={[
                      { value: "weekly", label: "Weekly" },
                      { value: "biweekly", label: "Every 2 weeks" },
                    ]}
                  />
                </div>

                {/* Auto-generated dates (individually editable) */}
                {episodes.some((ep) => ep.premiereDate) ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-text-secondary">Episode premiere dates</label>
                    {episodes.map((ep, idx) => (
                      <div key={ep.episodeNumber} className="flex items-center gap-2">
                        <span className="w-16 text-xs text-text-tertiary">Ep {ep.episodeNumber}</span>
                        <input
                          type="datetime-local"
                          value={ep.premiereDate}
                          min={new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                          onChange={(e) => updateEpisode(idx, { premiereDate: e.target.value })}
                          className="flex-1 rounded-lg border border-border bg-page py-1.5 px-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Upload your final film</label>
              <p className="text-xs text-text-tertiary">Final film uploads support files up to {FULL_FILM_UPLOAD_MAX_MB / 1000} GB.</p>
              <VideoUpload
                currentAssetId={filmBunnyId || null}
                onUpload={(bunnyVideoId) => void handleFilmUploaded(bunnyVideoId)}
                title={project.title}
                maxSizeMB={FULL_FILM_UPLOAD_MAX_MB}
              />
              {filmRegistering ? (
                <p className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Loader2 size={12} className="animate-spin" /> Registering video...
                </p>
              ) : null}
              {filmVideoId ? <p className="text-xs text-role-success-fg">Video ready for delivery.</p> : null}
            </div>
          )}

          {/* Premiere date — inline for non-series (series has its own per-episode schedule above) */}
          {!isSeries && project.lifecycle_status !== "premiering" ? (
            <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
              <h4 className="text-sm font-semibold text-text-primary">Premiere Date</h4>
              <p className="text-xs text-text-tertiary">When should your film premiere? Viewers will see a countdown.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-text-secondary">Date</label>
                  <input
                    type="date"
                    value={premiereDate}
                    min={new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    onChange={(e) => setPremiereDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-page py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-text-secondary">Time</label>
                  <input
                    type="time"
                    value={premiereTime}
                    onChange={(e) => setPremiereTime(e.target.value)}
                    className="w-full rounded-lg border border-border bg-page py-2 px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              {premiereDate && premiereTime ? (
                <p className="text-xs text-amber-400">
                  Premiere: {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(`${premiereDate}T${premiereTime}`))}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Release price editing */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Release price</label>
            <p className="text-xs text-text-tertiary">
              Price for non-backers to buy access ({preorderPriceFloorApplies ? `min ${formatPrice(project.preorder_price_cents ?? 300)}` : "$3\u2013$200"})
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">$</span>
              <input
                type="number"
                min={preorderPriceFloorApplies ? ((project.preorder_price_cents ?? 300) / 100) : 3}
                max={200}
                step="0.01"
                value={(deliveryReleasePriceCents / 100).toFixed(2)}
                onChange={(e) => {
                  const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                  setDeliveryReleasePriceCents(cents);
                }}
                className="w-full rounded-lg border border-border bg-surface py-2 pl-7 pr-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {!priceValid && deliveryReleasePriceCents > 0 ? (
              <p className="text-xs text-role-danger-fg">
                {deliveryReleasePriceCents < 300 ? "Minimum $3" :
                 deliveryReleasePriceCents > 20000 ? "Maximum $200" :
                 `Must be at least ${formatPrice(project.preorder_price_cents ?? 300)} (preorder price)`}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-surface p-3 text-xs text-text-tertiary space-y-1">
            {isSeries ? (
              <>
                <p>Your series will move to premiering status. Episodes will premiere on the dates you set.</p>
                {project.preorder_count_cache > 0 ? (
                  <p>{project.preorder_count_cache} backer{project.preorder_count_cache !== 1 ? "s" : ""} will receive access to each episode as it premieres.</p>
                ) : null}
              </>
            ) : (
              <>
                <p>{premiereDate && premiereTime ? "Your film will be delivered and premiere will be scheduled." : "Your film will move to premiering status."}</p>
                {project.preorder_count_cache > 0 ? (
                  <p>{project.preorder_count_cache} backer{project.preorder_count_cache !== 1 ? "s" : ""} will receive access.</p>
                ) : null}
              </>
            )}
            <p>Non-backers can purchase access for {formatPrice(deliveryReleasePriceCents)}.</p>
          </div>

          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="mt-0.5" checked={confirmFinalCut} onChange={(e) => setConfirmFinalCut(e.target.checked)} />
            {isSeries ? "I confirm all episodes are final versions." : "I confirm this is the final version."}
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeliveryModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => void deliverFilm()}
              disabled={
                pendingKey === "deliver" ||
                (isSeries ? (!allEpisodesReady || anyEpisodeRegistering) : (!filmVideoId.trim() || filmRegistering)) ||
                !confirmFinalCut ||
                !priceValid
              }
            >
              {pendingKey === "deliver" ? <Loader2 size={14} className="animate-spin" /> : null}
              {isSeries ? "Deliver Series" : "Confirm Delivery"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* -- Make Free Modal -- */}
      <Modal open={makeFreeModalOpen} onClose={() => setMakeFreeModalOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-text-primary">Make Release Free</h3>
          <div className="rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary space-y-2">
            <p>
              This will make <span className="text-text-primary">{project.title}</span> free to watch for everyone.
            </p>
            <p>Existing preorders and purchases stay intact. No refunds are issued.</p>
            <p>This change is one-way. You will not be able to switch the release back to paid later.</p>
          </div>
          {project.release_price_cents ? (
            <p className="text-xs text-text-tertiary">
              Current public price: {formatPrice(project.release_price_cents)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMakeFreeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={pendingKey === "make-free"}
              onClick={() => void makeFilmFree()}
            >
              {pendingKey === "make-free" ? <Loader2 size={14} className="animate-spin" /> : null}
              Confirm Free Release
            </Button>
          </div>
        </div>
      </Modal>

      {/* -- Premiere Modal -- */}
      <Modal open={premiereModalOpen} onClose={() => setPremiereModalOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-text-primary">Schedule Premiere</h3>
          <p className="text-sm text-text-secondary">Set the date and time for your film premiere. Viewers will see a countdown and can tune in live.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Date" type="date" value={premiereDate} onChange={(e) => setPremiereDate(e.target.value)}
              min={new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split("T")[0]}
              max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
            />
            <Input label="Time" type="time" value={premiereTime} onChange={(e) => setPremiereTime(e.target.value)} />
          </div>
          {premiereDate && premiereTime ? (
            <div className="rounded-lg border border-role-warning-border bg-role-warning-bg p-3 text-sm text-role-warning-fg">
              Premiere scheduled for{" "}
              {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(`${premiereDate}T${premiereTime}`))}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPremiereModalOpen(false)}>Cancel</Button>
            <Button
              disabled={!premiereDate || !premiereTime || premiereSubmitting}
              onClick={async () => {
                if (!premiereDate || !premiereTime) return;
                setPremiereSubmitting(true);
                setErrorMessage(null);
                try {
                  const dt = new Date(`${premiereDate}T${premiereTime}`);
                  const res = await fetch(`/api/projects/${project.id}/premiere`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ premiere_at: dt.toISOString() }),
                  });
                  const payload = await res.json();
                  if (!res.ok) throw new Error(payload.error ?? "Failed to schedule premiere");
                  setSuccessMessage("Premiere scheduled!");
                  setPremiereModalOpen(false);
                  setPremiereDate("");
                  setPremiereTime("");
                  router.refresh();
                } catch (err) {
                  setErrorMessage(err instanceof Error ? err.message : "Failed to schedule premiere");
                } finally {
                  setPremiereSubmitting(false);
                }
              }}
            >
              {premiereSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Confirm Premiere
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
