import Link from "next/link";
import { ArrowRight, LayoutGrid, Signal, Sparkles } from "lucide-react";

import { CategoryPillRow } from "@/components/category-pill-row";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { MetricCard } from "@/components/metric-card";
import { PersonCard } from "@/components/person-card";
import { TrendStack } from "@/components/trend-stack";
import { appStats, categories, people, posts, toolsBySlug } from "@/lib/sample-data";
import { getLeaderboard } from "@/lib/ranking/score";
import { getTrendingFeed } from "@/lib/trending/score";

export default function LandingPage() {
  return (
    <div className="signal-grid min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] font-semibold">
              AI
            </div>
            <div>
              <div className="text-lg font-semibold">AI Signal</div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Leaderboards + category rooms</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:scale-[1.01]">
              Open product
            </Link>
          </div>
        </header>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="signal-card rounded-[36px] p-8 lg:p-10">
            <div className="signal-kicker">AI signal, not AI chaos</div>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.06em] lg:text-7xl">
              The category-first AI market for tools, rankings, and live discussion.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 lg:text-lg">
              See what is best right now, what changed today, and where the best conversation is happening
              without digging through a universal feed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:scale-[1.01]">
                <LayoutGrid className="h-4 w-4" />
                Enter signal board
              </Link>
              <Link href="/leaderboard" className="signal-chip inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm text-slate-200 transition hover:bg-white/[0.08]">
                <Signal className="h-4 w-4" />
                View leaderboards
              </Link>
            </div>
          </section>
          <section className="signal-card rounded-[36px] p-8">
            <div className="signal-kicker">Why it feels different</div>
            <div className="mt-6 space-y-4">
              {[
                "Leaderboards are built into the product, not bolted on later.",
                "Every conversation belongs to a category and a context.",
                "Trending is shaped by releases, discussion, movement, and saves.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 text-warning" />
                  <p className="text-sm leading-6 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {appStats.map((stat) => (
            <MetricCard key={stat.label} stat={stat} />
          ))}
        </div>
        <section className="mt-8 signal-card rounded-[32px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="signal-kicker">Category rooms</div>
              <h2 className="mt-2 text-2xl font-semibold">A cleaner way to browse AI</h2>
            </div>
            <Link href="/categories" className="signal-link inline-flex items-center gap-2 text-sm text-electric">
              View all categories
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5">
            <CategoryPillRow categories={categories} />
          </div>
        </section>
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <LeaderboardPanel
            title="Top tools across the strongest lanes"
            subtitle="A product-native leaderboard system with movement, rationale, and category context."
            entries={[
              ...getLeaderboard("reasoning").slice(0, 1),
              ...getLeaderboard("coding").slice(0, 1),
              ...getLeaderboard("video").slice(0, 1),
            ]}
            toolsBySlug={toolsBySlug}
          />
          <TrendStack events={getTrendingFeed()} />
        </div>
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="signal-card rounded-[28px] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {post.category} / {post.postType.replace("_", " ")}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold">{post.title}</h3>
                  </div>
                  <Link href={`/people/${post.authorHandle}`} className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300">
                    @{post.authorHandle}
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{post.body}</p>
              </div>
            ))}
          </section>
          <section className="space-y-4">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
