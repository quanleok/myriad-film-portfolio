"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Clock3, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { LifecycleBadge } from "@/components/projects/lifecycle-badge";
import { ProjectProgressBar } from "@/components/projects/project-progress-bar";
import { getLifecycleHoverGlow } from "@/components/projects/lifecycle-visuals";
import { safeProgress, formatRuntime, formatCountdown, daysUntilDelivery } from "@/components/projects/utils";
import { cn, formatPrice } from "@/lib/utils";
import type { ProjectLifecycleStatus, PreorderStatus, EntitlementSource } from "@/types/project";

type LibraryTab = "watch_now" | "premiering" | "backed" | "all" | "saved";
type LibraryVisualState = "unlocking" | "in_production" | "premiering" | "released" | "refunded";

interface LibraryProjectSummary {
  id: string;
  title: string;
  slug: string | null;
  teaser_thumbnail_url: string | null;
  lifecycle_status: ProjectLifecycleStatus;
  preorder_count_cache: number;
  unlock_target: number | null;
  film_video_id: string | null;
  runtime_minutes: number | null;
  premiere_date: string | null;
  estimated_delivery_at: string | null;
  purchase_count_cache: number;
  update_count_cache: number;
  production_window_days: number | null;
}

interface PreorderRow {
  id: string;
  project_id: string;
  amount_cents: number;
  current_status: PreorderStatus;
  created_at: string;
  refunded_at: string | null;
  project: LibraryProjectSummary | null;
}

interface PurchaseRow {
  id: string;
  project_id: string;
  amount_cents: number;
  created_at: string;
  project: LibraryProjectSummary | null;
}

interface EntitlementRow {
  id: string;
  project_id: string;
  video_id: string | null;
  source_type: EntitlementSource;
  granted_at: string;
}

// Unified library item combining preorders + purchases
interface LibraryItem {
  key: string;
  project: LibraryProjectSummary;
  source: "preorder" | "purchase";
  amount_cents: number;
  created_at: string;
  preorder_status?: PreorderStatus;
  refunded_at?: string | null;
  entitlement: EntitlementRow | null;
}

const TAB_LABELS: Record<LibraryTab, string> = {
  watch_now: "Watch Now",
  premiering: "Premiering",
  backed: "Backed",
  all: "All",
  saved: "Saved",
};

function getItemVisualState(item: LibraryItem): LibraryVisualState {
  const lifecycle = item.project.lifecycle_status;

  if (item.source === "purchase") {
    if (lifecycle === "released") return "released";
    if (lifecycle === "premiering") return "premiering";
    return "released";
  }

  if (
    lifecycle === "failed_to_unlock" ||
    lifecycle === "cancelled" ||
    item.preorder_status === "refunded" ||
    item.preorder_status === "cancelled"
  ) {
    return "refunded";
  }

  if (lifecycle === "released") return "released";
  if (lifecycle === "premiering") return "premiering";
  if (lifecycle === "in_production") return "in_production";
  return "unlocking";
}

function ProgressRing({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(100, value));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalized / 100);

  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg className="h-11 w-11 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle
          cx="20"
          cy="20"
          r={radius}
          strokeWidth="4"
          className="text-black/10 dark:text-white/20"
          stroke="currentColor"
          fill="none"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          strokeWidth="4"
          className="text-role-cta-bg"
          stroke="currentColor"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-role-fg-primary">
        {normalized}%
      </span>
    </div>
  );
}

function LibraryStatusPanel({ item, state }: { item: LibraryItem; state: LibraryVisualState }) {
  const { project } = item;
  const progress = safeProgress(project.preorder_count_cache, project.unlock_target);

  if (state === "unlocking") {
    const runtime = formatRuntime(project.runtime_minutes);
    return (
      <div className="rounded-xl border border-teal-400/30 bg-teal-500/5 p-3">
        <div className="flex items-center gap-3">
          <ProgressRing value={progress} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-teal-300">Seed</p>
            <p className="text-xs text-role-fg-secondary">
              {project.preorder_count_cache.toLocaleString()} / {(project.unlock_target ?? 0).toLocaleString()} preorders
            </p>
            {runtime ? <p className="text-[11px] text-role-fg-tertiary">{runtime}</p> : null}
          </div>
        </div>
        <ProjectProgressBar value={progress} className="mt-2 h-2 bg-role-bg-surface-active" vibrant status={project.lifecycle_status} />
      </div>
    );
  }

  if (state === "in_production") {
    const daysLeft = daysUntilDelivery(project.estimated_delivery_at);
    const updateCount = project.update_count_cache ?? 0;
    const expectedUpdates = Math.max(3, Math.ceil((project.production_window_days ?? 90) / 30));
    return (
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-purple-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Being Made</p>
        </div>
        <div className="mt-1.5 space-y-1 text-xs text-role-fg-secondary">
          <p>{updateCount} / {expectedUpdates} updates posted</p>
          {daysLeft !== null ? (
            <p>Delivery deadline: {daysLeft > 0 ? `${daysLeft} days left` : "Due now"}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (state === "premiering") {
    const countdown = formatCountdown(project.premiere_date);
    const viewers = project.preorder_count_cache + (project.purchase_count_cache ?? 0);
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Sparkles size={14} aria-hidden="true" />
          <p className="text-sm font-semibold">Premiere Soon</p>
        </div>
        <div className="mt-1.5 space-y-1 text-xs text-role-fg-secondary">
          {countdown ? (
            <p>Premieres {countdown}{project.premiere_date ? ` — ${new Date(project.premiere_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}</p>
          ) : project.premiere_date ? (
            <p>Premieres {new Date(project.premiere_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
          ) : null}
          {viewers > 0 ? <p>{viewers.toLocaleString()} viewers</p> : null}
        </div>
      </div>
    );
  }

  if (state === "released") {
    const viewers = project.preorder_count_cache + (project.purchase_count_cache ?? 0);
    const runtime = formatRuntime(project.runtime_minutes);
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Play size={14} className="fill-current" aria-hidden="true" />
          <p className="text-sm font-semibold">Ready to Watch</p>
        </div>
        <div className="mt-1.5 space-y-1 text-xs text-role-fg-secondary">
          {viewers > 0 ? <p>{viewers.toLocaleString()} viewers</p> : null}
          {runtime ? <p>{runtime}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-role-border-default bg-role-bg-subtle p-3">
      <p className="text-sm font-semibold text-role-fg-primary">Refunded</p>
      <p className="mt-1 text-xs text-role-fg-secondary">This project was cancelled or failed to unlock. Your preorder was refunded.</p>
    </div>
  );
}

interface SavedProject {
  id: string;
  title: string;
  slug: string | null;
  hook: string | null;
  teaser_thumbnail_url: string | null;
  lifecycle_status: string;
  preorder_count_cache: number;
  unlock_target: number | null;
  preorder_price_cents: number | null;
  release_price_cents: number | null;
  genre: string | null;
  format: string | null;
  saved_at: string;
}

export function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>("watch_now");
  const [preorders, setPreorders] = useState<PreorderRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/preorders/me");
        const payload = (await response.json()) as {
          preorders?: PreorderRow[];
          purchases?: PurchaseRow[];
          entitlements?: EntitlementRow[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load library");
        }

        setPreorders(payload.preorders ?? []);
        setPurchases(payload.purchases ?? []);
        setEntitlements(payload.entitlements ?? []);

        // Also fetch saved projects
        try {
          const savedRes = await fetch("/api/projects/saved");
          if (savedRes.ok) {
            const savedPayload = await savedRes.json();
            setSavedProjects(savedPayload.projects ?? []);
          }
        } catch {
          // Non-critical, ignore
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load library");
        setPreorders([]);
        setPurchases([]);
        setEntitlements([]);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  // Build entitlement lookup by project_id
  const entitlementMap = useMemo(
    () => new Map(entitlements.map((e) => [e.project_id, e])),
    [entitlements]
  );

  // Merge preorders + purchases into unified items, deduplicating by project
  const items = useMemo(() => {
    const seenProjects = new Set<string>();
    const result: LibraryItem[] = [];

    // Add active preorders first
    for (const row of preorders) {
      if (!row.project) continue;
      seenProjects.add(row.project_id);
      result.push({
        key: `preorder-${row.id}`,
        project: row.project,
        source: "preorder",
        amount_cents: row.amount_cents,
        created_at: row.created_at,
        preorder_status: row.current_status,
        refunded_at: row.refunded_at,
        entitlement: entitlementMap.get(row.project_id) ?? null,
      });
    }

    // Add purchases that aren't already covered by preorders
    for (const row of purchases) {
      if (!row.project || seenProjects.has(row.project_id)) continue;
      seenProjects.add(row.project_id);
      result.push({
        key: `purchase-${row.id}`,
        project: row.project,
        source: "purchase",
        amount_cents: row.amount_cents,
        created_at: row.created_at,
        entitlement: entitlementMap.get(row.project_id) ?? null,
      });
    }

    return result;
  }, [preorders, purchases, entitlementMap]);

  // Filter out refunded preorders for tab counts
  const activeItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.source === "purchase" ||
          (item.preorder_status && ["active", "committed"].includes(item.preorder_status))
      ),
    [items]
  );

  const tabCounts = useMemo(() => {
    const watchNow = activeItems.filter(
      (item) =>
        item.project.lifecycle_status === "released" ||
        item.entitlement !== null
    ).length;

    const premiering = activeItems.filter(
      (item) => item.project.lifecycle_status === "premiering"
    ).length;

    const backed = activeItems.filter(
      (item) =>
        item.source === "preorder" &&
        ["unlocking", "in_production"].includes(item.project.lifecycle_status)
    ).length;

    return {
      watchNow,
      premiering,
      backed,
      all: activeItems.length,
    };
  }, [activeItems]);

  const filtered = useMemo(() => {
    if (tab === "watch_now") {
      return activeItems.filter(
        (item) =>
          item.project.lifecycle_status === "released" ||
          item.entitlement !== null
      );
    }

    if (tab === "premiering") {
      return activeItems.filter(
        (item) => item.project.lifecycle_status === "premiering"
      );
    }

    if (tab === "backed") {
      return activeItems.filter(
        (item) =>
          item.source === "preorder" &&
          ["unlocking", "in_production"].includes(item.project.lifecycle_status)
      );
    }

    return activeItems;
  }, [activeItems, tab]);

  async function cancelPreorder(item: LibraryItem) {
    if (item.source !== "preorder" || item.project.lifecycle_status !== "unlocking") return;

    const previous = preorders;
    setPreorders((current) => current.filter((row) => `preorder-${row.id}` !== item.key));

    const preorderId = item.key.replace("preorder-", "");
    const response = await fetch(`/api/preorders/${preorderId}`, { method: "DELETE" });
    if (!response.ok) {
      setPreorders(previous);
    }
  }

  const tabs = [
    { value: "watch_now", label: TAB_LABELS.watch_now, count: tabCounts.watchNow },
    { value: "premiering", label: TAB_LABELS.premiering, count: tabCounts.premiering },
    { value: "backed", label: TAB_LABELS.backed, count: tabCounts.backed },
    { value: "all", label: TAB_LABELS.all, count: tabCounts.all },
    { value: "saved", label: TAB_LABELS.saved, count: savedProjects.length },
  ];

  const emptyStateConfig = useMemo(() => {
    if (tab === "watch_now") {
      return {
        title: "Nothing ready to watch yet",
        description: "When a film you backed reaches release, it will show up here first.",
        actions: [
          { href: "/browse", title: "Watch something now", body: "Browse released films and live premieres already playing on Myriad." },
          { href: "/premieres", title: "See upcoming premieres", body: "Track the next rooms opening soon and plan what to watch next." },
          { href: "/explore", title: "Back a project early", body: "Preorder a film before it is finished and unlock premiere access later." },
        ],
      };
    }

    if (tab === "premiering") {
      return {
        title: "No premieres in your library yet",
        description: "Premieres you can join will appear here as soon as they are scheduled.",
        actions: [
          { href: "/premieres", title: "See upcoming premieres", body: "Browse the next debuts and jump into project pages before they go live." },
          { href: "/browse?status=watchable", title: "Watch something now", body: "Explore the films already released or currently premiering." },
          { href: "/explore", title: "Back a project early", body: "Support a film before it premieres and watch first later." },
        ],
      };
    }

    return {
      title: "Your library is empty",
      description: "Start with something watchable, then back the projects you want to follow through production.",
      actions: [
        { href: "/browse", title: "Watch something now", body: "See the best watchable films, premieres, and live releases first." },
        { href: "/premieres", title: "See upcoming premieres", body: "Check the event lineup and return when the next room opens." },
        { href: "/explore", title: "Seed a project", body: "Swipe through teasers, story beats, and creator worlds before they are finished." },
      ],
    };
  }, [tab]);

  return (
    <div className="brand-halo-bg mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Library</h1>
        <p className="max-w-2xl text-sm text-text-secondary">
          Pick up where you left off: watch released films, track upcoming premieres, and stay close to the projects you backed early.
        </p>
      </header>

      <div className="rounded-2xl border border-role-border-subtle bg-role-bg-surface/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
        <PillTabs
          tabs={tabs}
          value={tab}
          onValueChange={(next) => setTab(next as LibraryTab)}
          className="gap-2"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-role-danger-border bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">{error}</div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={`library-skeleton-${idx}`} className="skeleton-shimmer aspect-[16/11] rounded-2xl" />
          ))}
        </div>
      ) : tab === "saved" ? (
        savedProjects.length === 0 ? (
          <EmptyState
            icon="🔖"
            title="No saved projects"
            description="Bookmark projects you're interested in to find them here later."
            actionLabel="Explore Projects"
            actionHref="/explore"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedProjects.map((sp) => {
              const projectHref = sp.slug ? `/project/${sp.slug}` : `/project/${sp.id}`;
              return (
                <Link
                  key={sp.id}
                  href={projectHref}
                  className="group relative overflow-hidden rounded-2xl border border-role-border-subtle bg-page-secondary transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {sp.teaser_thumbnail_url ? (
                      <img
                        src={sp.teaser_thumbnail_url}
                        alt={sp.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-role-bg-surface to-role-bg-page-secondary" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-display text-base font-bold text-white">{sp.title}</h3>
                      {sp.hook && <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{sp.hook}</p>}
                    </div>
                    <div className="absolute right-2.5 top-2.5">
                      <BookmarkCheck size={16} className="fill-brand-500 text-brand-500" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-text-primary">{emptyStateConfig.title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{emptyStateConfig.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {emptyStateConfig.actions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-2xl border border-border bg-page-secondary p-5 transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg"
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-lg">
                  {index === 0 ? "▶" : index === 1 ? "⏰" : "⚡"}
                </span>
                <h3 className="font-display font-semibold text-text-primary group-hover:text-brand-500">{action.title}</h3>
                <p className="mt-1 text-xs text-text-tertiary">{action.body}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="stagger-up grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const { project } = item;
            const projectHref = project.slug ? `/project/${project.slug}` : `/project/${project.id}`;
            const watchHref = project.film_video_id ? `/watch/${project.film_video_id}` : projectHref;
            const hasAccess = item.entitlement !== null;
            const state = getItemVisualState(item);

            return (
              <article
                key={item.key}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-l-4 border border-role-border-subtle bg-page-secondary transition-all duration-300 hover:-translate-y-0.5",
                  state === "unlocking" && "border-l-white/50",
                  state === "in_production" && "border-l-purple-500",
                  state === "premiering" && "border-l-amber-500",
                  state === "released" && "border-l-green-500",
                  state === "refunded" && "border-l-zinc-400 opacity-90",
                  state !== "refunded" && getLifecycleHoverGlow(project.lifecycle_status)
                )}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {project.teaser_thumbnail_url ? (
                    <img
                      src={project.teaser_thumbnail_url}
                      alt={project.title}
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                        state === "refunded" && "grayscale"
                      )}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-role-bg-surface to-role-bg-page-secondary" />
                  )}

                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent",
                      state === "refunded" && "from-black/85 via-black/55"
                    )}
                  />

                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <LifecycleBadge status={project.lifecycle_status} className="backdrop-blur-sm" />
                    {item.source === "purchase" ? (
                      <span className="rounded-full border border-brand-500/40 bg-brand-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-400 backdrop-blur-sm">
                        Purchased
                      </span>
                    ) : null}
                    {state === "premiering" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-role-warning-border bg-role-warning-bg/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-role-warning-fg">
                        <Sparkles size={10} aria-hidden="true" />
                        Premiere Soon
                      </span>
                    ) : null}
                    {state === "refunded" ? (
                      <span className="rounded-full border border-role-border-default bg-gray-200 dark:bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-600 dark:text-white/75">
                        Refunded
                      </span>
                    ) : null}
                  </div>

                  {state === "released" ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
                        <Play size={14} className="fill-current" aria-hidden="true" />
                        Watch Now
                      </span>
                    </div>
                  ) : null}

                  {state === "in_production" ? (
                    <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" aria-hidden="true" />
                      Being Made
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 p-4">
                  <div className="space-y-1">
                    <h2 className="line-clamp-2 text-lg font-semibold text-role-fg-primary">{project.title}</h2>
                    <p className="text-xs text-role-fg-tertiary">
                      {item.source === "purchase" ? "Purchased" : "Preordered"} {new Date(item.created_at).toLocaleDateString()} • {formatPrice(item.amount_cents)}
                    </p>
                  </div>

                  <LibraryStatusPanel item={item} state={state} />

                  <div className="flex flex-wrap gap-2 pt-1">
                    {hasAccess && state === "released" ? (
                      <>
                        <Link href={watchHref} className="inline-flex flex-1">
                          <Button size="sm" className="w-full" leftIcon={<Play size={14} aria-hidden="true" />}>
                            Watch Now
                          </Button>
                        </Link>
                        <Link href={projectHref} className="inline-flex flex-1">
                          <Button size="sm" variant="secondary" className="w-full">
                            Open Project
                          </Button>
                        </Link>
                      </>
                    ) : hasAccess && state === "premiering" ? (
                      <>
                        <Link href={watchHref} className="inline-flex flex-1">
                          <Button size="sm" className="w-full" leftIcon={<Play size={14} aria-hidden="true" />}>
                            Watch Premiere
                          </Button>
                        </Link>
                        <Link href={projectHref} className="inline-flex flex-1">
                          <Button size="sm" variant="secondary" className="w-full">
                            Open Project
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Link href={projectHref} className="inline-flex">
                        <Button size="sm">Open Project</Button>
                      </Link>
                    )}

                    {item.source === "preorder" &&
                      project.lifecycle_status === "unlocking" &&
                      item.preorder_status === "active" ? (
                      <Button size="sm" variant="ghost" onClick={() => void cancelPreorder(item)}>
                        Cancel Preorder
                      </Button>
                    ) : null}

                    {state === "premiering" && !hasAccess ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-role-warning-border/70 bg-role-warning-bg/20 px-2.5 py-1 text-[11px] font-medium text-role-warning-fg">
                        <Clock3 size={11} aria-hidden="true" />
                        Event notification coming soon
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
