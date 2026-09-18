import { notFound } from "next/navigation";

import { PostCard } from "@/components/post-card";
import { peopleByHandle, posts } from "@/lib/sample-data";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const person = peopleByHandle[handle];

  if (!person) {
    notFound();
  }

  const authoredPosts = posts.filter((post) => post.authorHandle === handle);

  return (
    <div className="space-y-6">
      <section className="signal-card rounded-[34px] p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="signal-kicker">{person.role}</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{person.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{person.bio}</p>
          </div>
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-right">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Credibility</div>
            <div className="mt-2 text-lg font-semibold">{person.credibilityLabel}</div>
            <div className="mt-3 text-sm text-slate-400">{person.followerCount.toLocaleString()} followers</div>
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div className="signal-kicker">Posts</div>
        {authoredPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
