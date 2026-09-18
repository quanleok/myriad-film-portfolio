import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { categories, toolsBySlug } from "@/lib/sample-data";
import { getLeaderboard } from "@/lib/ranking/score";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="signal-kicker">Leaderboard hub</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">The best tools, by category.</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
          Every lane gets its own ranking logic, context, and conversation instead of being flattened into one feed.
        </p>
      </section>
      {categories.map((category) => {
        const entries = getLeaderboard(category.slug);
        if (entries.length === 0) return null;

        return (
          <LeaderboardPanel
            key={category.slug}
            title={category.name}
            subtitle={category.description}
            entries={entries}
            toolsBySlug={toolsBySlug}
          />
        );
      })}
    </div>
  );
}
