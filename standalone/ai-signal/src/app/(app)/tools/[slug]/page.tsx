import { notFound } from "next/navigation";

import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { PostCard } from "@/components/post-card";
import { ToolSpotlight } from "@/components/tool-spotlight";
import { leaderboardEntries, posts, releases, toolsBySlug } from "@/lib/sample-data";

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = toolsBySlug[slug];

  if (!tool) {
    notFound();
  }

  const entries = leaderboardEntries.filter((entry) => entry.toolSlug === slug);
  const relatedPosts = posts.filter((post) => post.linkedToolSlugs.includes(slug));
  const relatedReleases = releases.filter((release) => release.toolSlug === slug);

  return (
    <div className="space-y-6">
      <ToolSpotlight tool={tool} />
      {entries.length > 0 ? (
        <LeaderboardPanel
          title={`${tool.name} placements`}
          subtitle="Rankings should feel explainable, not mysterious. Each appearance keeps its movement and rationale."
          entries={entries}
          toolsBySlug={toolsBySlug}
        />
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="signal-kicker">Discussion</div>
          {relatedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
        <section className="signal-card rounded-[32px] p-6">
          <div className="signal-kicker">Release history</div>
          <div className="mt-5 space-y-4">
            {relatedReleases.map((release) => (
              <div key={release.id} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{release.releasedAt}</div>
                <h3 className="mt-2 text-lg font-semibold">{release.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{release.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
