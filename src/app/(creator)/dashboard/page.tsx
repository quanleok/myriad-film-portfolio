import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { FF_PROJECT_DASHBOARD_ENABLED } from "@/lib/feature-flags";
import { resolveCreatorTrust } from "@/lib/creator-trust";
import { createClient } from "@/lib/supabase/server";
import { resolveCreatorFeeRate } from "@/lib/founding-program";
import { getFoundingProgramStatus } from "@/lib/founding-program-server";
import { getStripeOnboardingStatus } from "@/lib/stripe/connect";
import {
  ProjectDashboard,
  type DashboardDiscussionStats,
  type DashboardLaunchNotice,
  type DashboardPremiere,
  type DashboardProject,
  type DashboardUpdate,
} from "@/components/projects/project-dashboard";
import type { DashboardPendingInvite } from "@/components/projects/project-pending-invites";
import type { ProjectCollaboratorRole } from "@/types/project";

export const metadata = {
  title: "Creator Dashboard",
};

interface DashboardPageProps {
  searchParams: Promise<{
    project?: string;
    tab?: string;
    launch?: string;
    founding_awarded?: string;
    founding_existing?: string;
    founding_slot?: string;
  }>;
}

interface DiscussionRow {
  id: string;
  parent_post_id: string | null;
  is_creator_reply: boolean;
  created_at: string;
}

interface CollaboratorRow {
  id: string;
  project_id: string;
  role: ProjectCollaboratorRole;
  invite_status: "pending" | "accepted" | "declined" | "revoked";
  can_view_earnings: boolean;
  created_at: string;
}

const FLAGGED_STATUSES = new Set(["flagged", "rejected", "suspended"]);
const PROJECT_SELECT =
  "id, creator_id, title, hook, synopsis, slug, genre, content_rating, teaser_asset_id, teaser_thumbnail_url, lifecycle_status, launch_mode, moderation_status, campaign_ends_at, estimated_delivery_at, delivered_at, film_video_id, release_option, purchase_price_cents, preorder_count_cache, like_count_cache, discussion_count_cache, save_count_cache, unlock_target, preorder_price_cents, campaign_duration_days, production_window_days, production_progress, updated_at, manual_greenlight_eligible, delivery_deadline, grace_period_end, is_overdue, release_price_cents, format, episode_count, greenlit_at, greenlit_by, preorders_closed_at";

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  if (!FF_PROJECT_DASHBOARD_ENABLED) {
    redirect("/content");
  }

  const params = await searchParams;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "is_creator, creator_onboarding_completed, creator_good_standing, strike_count, stripe_account_id, stripe_onboarding_complete, available_balance_cents, held_balance_cents, delivered_project_count, is_founding_creator, founding_creator_approved_at"
    )
    .eq("id", user.id)
    .single();

  const { data: collaboratorRows } = await adminSupabase
    .from("project_collaborators")
    .select("id, project_id, role, invite_status, can_view_earnings, created_at")
    .eq("user_id", user.id)
    .neq("role", "owner")
    .in("invite_status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  const acceptedCollaborators = ((collaboratorRows ?? []) as CollaboratorRow[]).filter(
    (row) => row.invite_status === "accepted"
  );
  const pendingCollaborators = ((collaboratorRows ?? []) as CollaboratorRow[]).filter(
    (row) => row.invite_status === "pending"
  );

  const canCreateProjects = Boolean(
    profile?.is_creator && profile.creator_onboarding_completed
  );
  const selectedTab = params.tab === "earnings" ? "earnings" : "projects";

  if (!profile?.is_creator && acceptedCollaborators.length === 0 && pendingCollaborators.length === 0) {
    redirect("/");
  }

  if (
    profile?.is_creator &&
    !profile.creator_onboarding_completed &&
    acceptedCollaborators.length === 0 &&
    pendingCollaborators.length === 0
  ) {
    redirect("/onboarding");
  }

  let stripeReady = profile?.stripe_onboarding_complete ?? false;
  if (profile?.stripe_account_id && !stripeReady) {
    try {
      stripeReady = await getStripeOnboardingStatus(profile.stripe_account_id);
      if (stripeReady !== Boolean(profile.stripe_onboarding_complete)) {
        await supabase
          .from("profiles")
          .update({ stripe_onboarding_complete: stripeReady })
          .eq("id", user.id);
      }
    } catch (error) {
      console.error("[dashboard] failed to refresh Stripe onboarding state:", error);
    }
  }

  const [ownedProjectsResult, collaboratorProjectsResult] = await Promise.all([
    canCreateProjects
      ? supabase
          .from("projects")
          .select(PROJECT_SELECT)
          .eq("creator_id", user.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    acceptedCollaborators.length > 0
      ? adminSupabase
          .from("projects")
          .select(PROJECT_SELECT)
          .in(
            "id",
            acceptedCollaborators.map((row) => row.project_id)
          )
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  const ownedProjectRows = (ownedProjectsResult.data ?? []) as Record<string, unknown>[];
  const collaboratorProjectRows = (collaboratorProjectsResult.data ?? []) as Record<string, unknown>[];

  const collaboratorByProjectId = new Map(
    acceptedCollaborators.map((row) => [row.project_id, row])
  );
  const creatorIds = Array.from(
    new Set(
      [...ownedProjectRows, ...collaboratorProjectRows]
        .map((project) => String(project.creator_id ?? ""))
        .filter(Boolean)
    )
  );

  const creatorFeeRateById = new Map<string, number>();
  if (creatorIds.length > 0) {
    const { data: creatorFeeProfiles } = await adminSupabase
      .from("profiles")
      .select("id, is_founding_creator, founding_creator_approved_at")
      .in("id", creatorIds);

    for (const feeProfile of creatorFeeProfiles ?? []) {
      creatorFeeRateById.set(
        feeProfile.id,
        resolveCreatorFeeRate({
          is_founding_creator: feeProfile.is_founding_creator,
          founding_creator_approved_at: feeProfile.founding_creator_approved_at,
        })
      );
    }
  }

  // H2 fix: Only query financial events for owned projects + collaborator projects with earnings visibility
  const earningsVisibleCollabIds = collaboratorProjectRows
    .filter((project) => {
      const collab = collaboratorByProjectId.get(String(project.id));
      return collab?.can_view_earnings;
    })
    .map((project) => String(project.id));
  const allProjectIds = [
    ...ownedProjectRows.map((project) => String(project.id)),
    ...earningsVisibleCollabIds,
  ];

  const revenueByProject: Record<string, number> = {};
  if (allProjectIds.length > 0) {
    const { data: fEvents } = await adminSupabase
      .from("project_financial_events")
      .select("project_id, event_type, amount_cents")
      .in("project_id", allProjectIds)
      .in(
        "event_type",
        ["preorder_charge", "purchase_charge", "preorder_refund", "purchase_refund", "dispute_debit"]
      );

    for (const ev of fEvents ?? []) {
      const pid = ev.project_id;
      if (!revenueByProject[pid]) revenueByProject[pid] = 0;
      if (ev.event_type === "preorder_charge" || ev.event_type === "purchase_charge") {
        revenueByProject[pid] += ev.amount_cents;
      } else {
        revenueByProject[pid] -= ev.amount_cents;
      }
    }
  }

  function mapProject(
    project: Record<string, unknown>,
    accessRole: ProjectCollaboratorRole,
    canViewEarnings: boolean,
    isOwner: boolean
  ): DashboardProject {
    return {
      id: String(project.id),
      title: String(project.title),
      hook: (project.hook as string | null) ?? null,
      synopsis: (project.synopsis as string | null) ?? null,
      slug: (project.slug as string | null) ?? null,
      genre: (project.genre as string | null) ?? null,
      content_rating: (project.content_rating as string | null) ?? null,
      teaser_asset_id: (project.teaser_asset_id as string | null) ?? null,
      teaser_thumbnail_url: (project.teaser_thumbnail_url as string | null) ?? null,
      lifecycle_status: project.lifecycle_status as DashboardProject["lifecycle_status"],
      launch_mode: (project.launch_mode as DashboardProject["launch_mode"]) ?? "preorder",
      moderation_status: project.moderation_status as DashboardProject["moderation_status"],
      campaign_ends_at: (project.campaign_ends_at as string | null) ?? null,
      estimated_delivery_at: (project.estimated_delivery_at as string | null) ?? null,
      delivered_at: (project.delivered_at as string | null) ?? null,
      film_video_id: (project.film_video_id as string | null) ?? null,
      release_option: (project.release_option as string | null) ?? null,
      purchase_price_cents: (project.purchase_price_cents as number | null) ?? null,
      preorder_count_cache: Number(project.preorder_count_cache ?? 0),
      like_count_cache: Number(project.like_count_cache ?? 0),
      discussion_count_cache: Number(project.discussion_count_cache ?? 0),
      save_count_cache: Number(project.save_count_cache ?? 0),
      unlock_target: (project.unlock_target as number | null) ?? null,
      preorder_price_cents: (project.preorder_price_cents as number | null) ?? null,
      campaign_duration_days: (project.campaign_duration_days as number | null) ?? null,
      production_window_days: (project.production_window_days as number | null) ?? null,
      production_progress: Number(project.production_progress ?? 0),
      manual_greenlight_eligible: Boolean(project.manual_greenlight_eligible ?? false),
      delivery_deadline: (project.delivery_deadline as string | null) ?? null,
      grace_period_end: (project.grace_period_end as string | null) ?? null,
      is_overdue: Boolean(project.is_overdue ?? false),
      release_price_cents: (project.release_price_cents as number | null) ?? null,
      format: (project.format as string | null) ?? null,
      episode_count: (project.episode_count as number | null) ?? null,
      greenlit_at: (project.greenlit_at as string | null) ?? null,
      greenlit_by: (project.greenlit_by as "auto" | "manual" | null) ?? null,
      preorders_closed_at: (project.preorders_closed_at as string | null) ?? null,
      updated_at: String(project.updated_at ?? new Date(0).toISOString()),
      ledger_revenue_cents: (isOwner || canViewEarnings) ? (revenueByProject[String(project.id)] ?? 0) : 0,
      platform_fee_rate:
        creatorFeeRateById.get(String(project.creator_id ?? "")) ?? 0.2,
      access_role: accessRole,
      can_view_earnings: canViewEarnings,
      is_owner: isOwner,
    };
  }

  const ownedProjects = ownedProjectRows.map((project) =>
    mapProject(project, "owner", true, true)
  );
  const collaboratorProjects = collaboratorProjectRows
    .filter((project) => String(project.creator_id) !== user.id)
    .map((project) => {
      const collaborator = collaboratorByProjectId.get(String(project.id));
      return mapProject(
        project,
        collaborator?.role ?? "viewer",
        Boolean(collaborator?.can_view_earnings),
        false
      );
    });

  const projects = [...ownedProjects, ...collaboratorProjects].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const creatorStatus = profile
    ? {
        isFoundingCreator: Boolean(profile.is_founding_creator),
        foundingCreatorApprovedAt:
          (profile.founding_creator_approved_at as string | null) ?? null,
        deliveredProjectCount: profile.delivered_project_count ?? 0,
        platformFeeRate: resolveCreatorFeeRate({
          is_founding_creator: profile.is_founding_creator,
          founding_creator_approved_at: profile.founding_creator_approved_at,
        }),
        trust: resolveCreatorTrust({
          isFoundingCreator: profile.is_founding_creator,
          releasedProjectCount: profile.delivered_project_count,
        }),
      }
    : null;
  const foundingProgram = await getFoundingProgramStatus(user.id);
  const foundingSlot =
    typeof params.founding_slot === "string" && params.founding_slot.trim()
      ? Number.parseInt(params.founding_slot, 10)
      : null;
  const launchNotice: DashboardLaunchNotice | null =
    params.launch === "teaser"
      ? {
          isTeaserLaunch: true,
          foundingAwarded: params.founding_awarded === "1",
          foundingExisting: params.founding_existing === "1",
          foundingSlot:
            typeof foundingSlot === "number" && Number.isFinite(foundingSlot)
              ? foundingSlot
              : null,
        }
      : null;

  const pendingProjectIds = pendingCollaborators.map((row) => row.project_id);
  const { data: pendingProjectsData } =
    pendingProjectIds.length > 0
      ? await adminSupabase
          .from("projects")
          .select("id, title, creator_id")
          .in("id", pendingProjectIds)
      : { data: [] as Record<string, unknown>[] };

  const pendingProjects = (pendingProjectsData ?? []) as Record<string, unknown>[];
  const pendingCreators = Array.from(
    new Set(pendingProjects.map((project) => String(project.creator_id)))
  );

  const { data: pendingOwnerProfiles } =
    pendingCreators.length > 0
      ? await adminSupabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", pendingCreators)
      : { data: [] as Record<string, unknown>[] };

  const ownerProfileMap = new Map(
    ((pendingOwnerProfiles ?? []) as Record<string, unknown>[]).map((profileRow) => [
      String(profileRow.id),
      profileRow,
    ])
  );
  const pendingProjectMap = new Map(
    pendingProjects.map((project) => [String(project.id), project])
  );

  const pendingInvites: DashboardPendingInvite[] = pendingCollaborators
    .map((invite) => {
      const project = pendingProjectMap.get(invite.project_id);
      if (!project) return null;
      const ownerProfile = ownerProfileMap.get(String(project.creator_id));
      return {
        id: invite.id,
        project_id: invite.project_id,
        project_title: String(project.title),
        owner_display_name:
          (ownerProfile?.display_name as string | null | undefined) ?? null,
        owner_username:
          (ownerProfile?.username as string | null | undefined) ?? null,
        role: invite.role,
        can_view_earnings: invite.can_view_earnings,
        created_at: invite.created_at,
      };
    })
    .filter((invite): invite is DashboardPendingInvite => invite !== null);

  const activeFlags = ownedProjects.filter((item) =>
    FLAGGED_STATUSES.has(item.moderation_status)
  ).length;

  const selectedProject = params.project
    ? projects.find((item) => item.id === params.project) ?? null
    : null;

  if (!selectedProject) {
    return (
      <ProjectDashboard
        projects={projects}
        pendingInvites={pendingInvites}
        selectedProjectId={null}
        selectedTab={selectedTab}
        recentUpdates={[]}
        discussion={{ totalPosts: 0, newThisWeek: 0, unanswered: 0 }}
        preordersToday={0}
        preordersThisWeek={0}
        premiere={null}
        creatorStatus={creatorStatus}
        foundingProgram={foundingProgram}
        launchNotice={launchNotice}
        profileBalance={{
          availableBalanceCents: profile?.available_balance_cents ?? 0,
          heldBalanceCents: profile?.held_balance_cents ?? 0,
          deliveredProjectCount: profile?.delivered_project_count ?? 0,
        }}
        accountHealth={{
          creatorGoodStanding: profile?.creator_good_standing ?? true,
          strikeCount: profile?.strike_count ?? 0,
          activeFlags,
          stripeReady,
        }}
        canCreateProjects={canCreateProjects}
      />
    );
  }

  const [updatesResult, discussionResult, premiereResult] = await Promise.all([
    adminSupabase
      .from("project_updates")
      .select("id, update_type, title, created_at")
      .eq("project_id", selectedProject.id)
      .order("created_at", { ascending: false })
      .limit(5),
    adminSupabase
      .from("project_discussion_posts")
      .select("id, parent_post_id, is_creator_reply, created_at")
      .eq("project_id", selectedProject.id),
    selectedProject.film_video_id
      ? adminSupabase
          .from("videos")
          .select("premiere_at, is_premiere_live, premiere_ended")
          .eq("id", selectedProject.film_video_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const recentUpdates: DashboardUpdate[] = (updatesResult.data ?? []).map((row) => ({
    id: row.id,
    update_type: row.update_type,
    title: row.title,
    created_at: row.created_at,
  }));

  const discussionRows = (discussionResult.data ?? []) as DiscussionRow[];
  const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const creatorRepliesTo = new Set(
    discussionRows
      .filter((row) => row.is_creator_reply && row.parent_post_id)
      .map((row) => row.parent_post_id as string)
  );

  const discussion: DashboardDiscussionStats = {
    totalPosts: discussionRows.length,
    newThisWeek: discussionRows.filter(
      (row) => new Date(row.created_at).getTime() >= weekAgoMs
    ).length,
    unanswered: discussionRows.filter(
      (row) => !row.parent_post_id && !creatorRepliesTo.has(row.id)
    ).length,
  };

  const premiere: DashboardPremiere | null = premiereResult.data
    ? {
        premiere_scheduled_at: premiereResult.data.premiere_at ?? null,
        is_premiere_live: premiereResult.data.is_premiere_live ?? false,
        premiere_ended: premiereResult.data.premiere_ended ?? false,
      }
    : null;

  let preordersToday = 0;
  let preordersThisWeek = 0;
  if (selectedProject.is_owner || selectedProject.can_view_earnings) {
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [todayResult, weekResult] = await Promise.all([
      adminSupabase
        .from("project_preorders")
        .select("id", { count: "exact", head: true })
        .eq("project_id", selectedProject.id)
        .gte("created_at", dayAgoIso),
      adminSupabase
        .from("project_preorders")
        .select("id", { count: "exact", head: true })
        .eq("project_id", selectedProject.id)
        .gte("created_at", weekAgoIso),
    ]);

    preordersToday = todayResult.count ?? 0;
    preordersThisWeek = weekResult.count ?? 0;
  }

  return (
    <ProjectDashboard
      projects={projects}
      pendingInvites={pendingInvites}
      selectedProjectId={selectedProject.id}
      selectedTab={selectedTab}
      recentUpdates={recentUpdates}
      discussion={discussion}
      preordersToday={preordersToday}
      preordersThisWeek={preordersThisWeek}
      premiere={premiere}
      creatorStatus={creatorStatus}
      foundingProgram={foundingProgram}
      launchNotice={launchNotice}
      profileBalance={{
        availableBalanceCents: profile?.available_balance_cents ?? 0,
        heldBalanceCents: profile?.held_balance_cents ?? 0,
        deliveredProjectCount: profile?.delivered_project_count ?? 0,
      }}
      accountHealth={{
        creatorGoodStanding: profile?.creator_good_standing ?? true,
        strikeCount: profile?.strike_count ?? 0,
        activeFlags,
        stripeReady,
      }}
      canCreateProjects={canCreateProjects}
    />
  );
}
