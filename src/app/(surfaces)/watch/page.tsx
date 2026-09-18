import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  fetchWatchSurfaceData,
  parseWatchSurfaceSort,
  parseWatchSurfaceTab,
} from "@/lib/video-hub";
import { WatchSurfacePage } from "@/components/landing/watch-surface-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Watch — Teasers, Trailers & Short Films",
  description: "Watch AI teasers, trailers, and short films from the community. Minimum 2 minutes.",
  alternates: {
    canonical: "/watch",
  },
};

export default async function WatchLandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tab = parseWatchSurfaceTab(typeof params.tab === "string" ? params.tab : null);
  const sort = parseWatchSurfaceSort(typeof params.sort === "string" ? params.sort : null);
  const tag = typeof params.tag === "string" ? params.tag : null;
  const tool = typeof params.tool === "string" ? params.tool : null;

  const supabase = await createClient();
  const data = await fetchWatchSurfaceData({
    supabase,
    query: q,
    tab,
    sort,
    tag,
    aiTool: tool,
    offset: 0,
    limit: 20,
  });

  return (
    <WatchSurfacePage
      initialQuery={q}
      initialTab={tab}
      initialSort={sort}
      initialTag={tag}
      initialAiTool={tool}
      initialVideos={data.videos}
      initialHasMore={data.hasMore}
      initialNextOffset={data.nextOffset}
      initialTabs={data.tabs}
      initialPopularTags={data.popularTags}
      initialAiTools={data.aiTools}
    />
  );
}
