"use client";

import { useRouter } from "next/navigation";
import type { FoundingProgramStatus } from "@/lib/founding-program";
import { DashboardOverview } from "./dashboard-overview";
import { DashboardDetail } from "./dashboard-detail";
import { DashboardCollaboratorDetail } from "./dashboard-collaborator-detail";
import type { DashboardPendingInvite } from "./project-pending-invites";
import type { CreatorTrustState } from "@/lib/creator-trust";
import type {
  ProjectCollaboratorRole,
  ProjectLaunchMode,
  ProjectLifecycleStatus,
  ProjectModerationStatus,
} from "@/types/project";

export type DashboardTab = "projects" | "earnings";

export interface DashboardProject {
  id: string;
  title: string;
  hook: string | null;
  synopsis: string | null;
  slug: string | null;
  genre: string | null;
  content_rating: string | null;
  teaser_asset_id: string | null;
  teaser_thumbnail_url: string | null;
  lifecycle_status: ProjectLifecycleStatus;
  launch_mode: ProjectLaunchMode;
  moderation_status: ProjectModerationStatus;
  campaign_ends_at: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  film_video_id: string | null;
  release_option: string | null;
  purchase_price_cents: number | null;
  preorder_count_cache: number;
  like_count_cache: number;
  discussion_count_cache: number;
  save_count_cache: number;
  unlock_target: number | null;
  preorder_price_cents: number | null;
  campaign_duration_days: number | null;
  production_window_days: number | null;
  production_progress: number;
  manual_greenlight_eligible: boolean;
  delivery_deadline: string | null;
  grace_period_end: string | null;
  is_overdue: boolean;
  release_price_cents: number | null;
  format: string | null;
  episode_count: number | null;
  greenlit_at: string | null;
  greenlit_by: "auto" | "manual" | null;
  preorders_closed_at: string | null;
  updated_at: string;
  ledger_revenue_cents: number;
  platform_fee_rate: number;
  access_role: ProjectCollaboratorRole;
  can_view_earnings: boolean;
  is_owner: boolean;
}

export interface DashboardCreatorStatus {
  isFoundingCreator: boolean;
  foundingCreatorApprovedAt: string | null;
  deliveredProjectCount: number;
  platformFeeRate: number;
  trust: CreatorTrustState;
}

export interface DashboardUpdate {
  id: string;
  update_type: "text" | "image" | "video";
  title: string | null;
  created_at: string;
}

export interface DashboardDiscussionStats {
  totalPosts: number;
  newThisWeek: number;
  unanswered: number;
}

export interface DashboardPremiere {
  premiere_scheduled_at: string | null;
  is_premiere_live: boolean;
  premiere_ended: boolean;
}

export interface DashboardLaunchNotice {
  isTeaserLaunch: boolean;
  foundingAwarded: boolean;
  foundingExisting: boolean;
  foundingSlot: number | null;
}

export interface ProjectDashboardProps {
  projects: DashboardProject[];
  pendingInvites: DashboardPendingInvite[];
  selectedProjectId: string | null;
  selectedTab: DashboardTab;
  recentUpdates: DashboardUpdate[];
  discussion: DashboardDiscussionStats;
  preordersToday: number;
  preordersThisWeek: number;
  premiere: DashboardPremiere | null;
  creatorStatus: DashboardCreatorStatus | null;
  foundingProgram: FoundingProgramStatus | null;
  launchNotice: DashboardLaunchNotice | null;
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
  canCreateProjects: boolean;
}

export function ProjectDashboard({
  projects,
  pendingInvites,
  selectedProjectId,
  selectedTab,
  recentUpdates,
  discussion,
  preordersToday,
  preordersThisWeek,
  premiere,
  creatorStatus,
  foundingProgram,
  launchNotice,
  profileBalance,
  accountHealth,
  canCreateProjects,
}: ProjectDashboardProps) {
  const router = useRouter();

  // If a project is selected (via URL param), show detail view
  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : null;

  function handleSelectProject(id: string) {
    const params = new URLSearchParams({ project: id, tab: selectedTab });
    router.push(`/dashboard?${params.toString()}`);
  }

  function handleBack() {
    router.push(selectedTab === "earnings" ? "/dashboard?tab=earnings" : "/dashboard");
  }

  // Detail view
  if (selectedProject) {
    if (!selectedProject.is_owner) {
      return (
        <DashboardCollaboratorDetail
          project={selectedProject}
          recentUpdates={recentUpdates}
          discussion={discussion}
          preordersToday={preordersToday}
          preordersThisWeek={preordersThisWeek}
          premiere={premiere}
          onBack={handleBack}
        />
      );
    }

    return (
      <DashboardDetail
        project={selectedProject}
        creatorStatus={creatorStatus}
        recentUpdates={recentUpdates}
        discussion={discussion}
        preordersToday={preordersToday}
        preordersThisWeek={preordersThisWeek}
        premiere={premiere}
        profileBalance={profileBalance}
        accountHealth={accountHealth}
        onBack={handleBack}
      />
    );
  }

  // Overview (card grid + earnings)
  return (
    <DashboardOverview
      projects={projects}
      pendingInvites={pendingInvites}
      selectedTab={selectedTab}
      onSelectProject={handleSelectProject}
      creatorStatus={creatorStatus}
      foundingProgram={foundingProgram}
      launchNotice={launchNotice}
      stripeReady={accountHealth.stripeReady}
      accountHealth={accountHealth}
      profileBalance={profileBalance}
      canCreateProjects={canCreateProjects}
    />
  );
}
