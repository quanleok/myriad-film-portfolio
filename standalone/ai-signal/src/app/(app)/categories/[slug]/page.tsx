import { notFound } from "next/navigation";

import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { PersonCard } from "@/components/person-card";
import { PostCard } from "@/components/post-card";
import { categoriesBySlug, people, posts, toolsBySlug } from "@/lib/sample-data";
import { getLeaderboard } from "@/lib/ranking/score";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = categoriesBySlug[slug];

  if (!category) {
    notFound();
  }

  const categoryPosts = posts.filter((post) => post.category === category.slug);
  const categoryPeople = people.filter((person) => person.expertise.includes(category.slug));

  return (
    <div className="space-y-6">
      <section className="signal-card rounded-[34px] p-8">
        <div className="signal-kicker">{category.name}</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{category.tagline}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{category.description}</p>
      </section>
      <LeaderboardPanel
        title={`${category.name} leaderboard`}
        subtitle="Category-native rankings with rationale and movement built in."
        entries={getLeaderboard(category.slug)}
        toolsBySlug={toolsBySlug}
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <div className="signal-kicker">Live posts</div>
          {categoryPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
        <section className="space-y-4">
          <div className="signal-kicker">Top voices</div>
          {categoryPeople.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </section>
      </div>
    </div>
  );
}
