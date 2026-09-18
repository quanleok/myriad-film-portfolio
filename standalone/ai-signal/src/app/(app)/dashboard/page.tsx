import { CategoryPillRow } from "@/components/category-pill-row";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { MetricCard } from "@/components/metric-card";
import { PersonCard } from "@/components/person-card";
import { PostCard } from "@/components/post-card";
import { TrendStack } from "@/components/trend-stack";
import { appStats, categories, people, posts, toolsBySlug } from "@/lib/sample-data";
import { getLeaderboard } from "@/lib/ranking/score";
import { getTrendingFeed } from "@/lib/trending/score";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="signal-card rounded-[36px] p-8">
        <div className="signal-kicker">Today’s signal board</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] lg:text-6xl">
          What matters in AI right now.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Leaderboards, category rooms, trend velocity, and structured posts all in one surface.
        </p>
        <div className="mt-6">
          <CategoryPillRow categories={categories} />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {appStats.map((stat) => (
          <MetricCard key={stat.label} stat={stat} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <LeaderboardPanel
          title="Cross-category snapshot"
          subtitle="The home surface starts with the most useful question: what is best right now?"
          entries={[
            ...getLeaderboard("reasoning").slice(0, 1),
            ...getLeaderboard("coding").slice(0, 1),
            ...getLeaderboard("video").slice(0, 1),
            ...getLeaderboard("news").slice(0, 1),
          ]}
          toolsBySlug={toolsBySlug}
        />
        <TrendStack events={getTrendingFeed()} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="signal-kicker">Hot discussions</div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
        <section className="space-y-4">
          <div className="signal-kicker">People to watch</div>
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </section>
      </div>
    </div>
  );
}
