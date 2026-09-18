import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/projects/landing-page";
import type { ProjectFeedItem } from "@/components/projects/types";

export const metadata: Metadata = {
  title: "AI Film Preorders",
  description:
    "Discover live AI film projects, preorder early, and return when they premiere.",
  alternates: { canonical: "/" },
};

const HOME_PROJECT_STATUSES = ["unlocking", "in_production", "premiering"];
const FUNDED_PROJECT_STATUSES = ["in_production", "premiering", "released"];

export default async function HomePage() {
  const supabase = await createClient();

  const [
    featuredProjectsRes,
    unlockingCountRes,
    premieringCountRes,
    totalBackersRes,
    fundedCountRes,
    creatorCountRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(`
        id,
        slug,
        title,
        hook,
        synopsis,
        inspiration_line,
        genre,
        format,
        tone,
        runtime_minutes,
        teaser_asset_id,
        teaser_thumbnail_url,
        preorder_price_cents,
        release_price_cents,
        unlock_target,
        preorder_count_cache,
        like_count_cache,
        discussion_count_cache,
        lifecycle_status,
        launch_mode,
        content_rating,
        created_at,
        premiere_date,
        campaign_ends_at,
        delivery_deadline,
        production_window_days,
        is_overdue,
        purchase_count_cache,
        update_count_cache,
        save_count_cache,
        production_progress,
        episode_count,
        is_test,
        profiles!projects_creator_id_fkey (
          display_name,
          username,
          avatar_url
        )
      `)
      .eq("moderation_status", "live")
      .in("lifecycle_status", HOME_PROJECT_STATUSES)
      .order("preorder_count_cache", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "live")
      .eq("lifecycle_status", "unlocking"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "live")
      .eq("lifecycle_status", "premiering"),
    supabase
      .from("project_preorders")
      .select("id", { count: "exact", head: true })
      .in("current_status", ["active", "committed"]),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "live")
      .in("lifecycle_status", FUNDED_PROJECT_STATUSES),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_creator", true),
  ]);

  const featuredProjects: ProjectFeedItem[] = (featuredProjectsRes.data ?? []).map((project) => {
    const profile = Array.isArray(project.profiles)
      ? (project.profiles[0] ?? null)
      : project.profiles;

    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      hook: project.hook,
      genre: project.genre,
      format: project.format,
      tone: project.tone,
      runtime_minutes: project.runtime_minutes,
      synopsis: project.synopsis,
      inspiration_line: project.inspiration_line,
      teaser_asset_id: project.teaser_asset_id,
      teaser_thumbnail_url: project.teaser_thumbnail_url,
      preorder_price_cents: project.preorder_price_cents,
      release_price_cents: project.release_price_cents,
      unlock_target: project.unlock_target,
      preorder_count_cache: project.preorder_count_cache ?? 0,
      like_count_cache: project.like_count_cache ?? 0,
      discussion_count_cache: project.discussion_count_cache ?? 0,
      interest_count_cache: 0,
      lifecycle_status: project.lifecycle_status,
      launch_mode: project.launch_mode ?? "preorder",
      content_rating: project.content_rating,
      created_at: project.created_at,
      profiles: profile
        ? {
            display_name: profile.display_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
          }
        : null,
      creator: null,
      character_cards: null,
      concept_cards: null,
      premiere_date: project.premiere_date,
      campaign_ends_at: project.campaign_ends_at,
      delivery_deadline: project.delivery_deadline,
      production_window_days: project.production_window_days,
      is_overdue: project.is_overdue ?? false,
      purchase_count_cache: project.purchase_count_cache ?? 0,
      update_count_cache: project.update_count_cache ?? 0,
      save_count_cache: project.save_count_cache ?? 0,
      preorders_today: 0,
      production_progress: project.production_progress ?? 0,
      episode_count: project.episode_count,
      is_test: project.is_test ?? false,
    };
  });

  return (
    <LandingPage
      featuredProjects={featuredProjects}
      stats={{
        unlockingCount: unlockingCountRes.count ?? 0,
        premieringCount: premieringCountRes.count ?? 0,
        totalBackers: totalBackersRes.count ?? 0,
        fundedCount: fundedCountRes.count ?? 0,
        creatorCount: creatorCountRes.count ?? 0,
      }}
    />
  );
}
