import { TrendStack } from "@/components/trend-stack";
import { PostCard } from "@/components/post-card";
import { posts } from "@/lib/sample-data";
import { getTrendingFeed } from "@/lib/trending/score";

export default function TrendingPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="signal-kicker">Trending</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Where momentum is actually moving.</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
          Not just what is loud. This surface combines release movement, discussion velocity, and category signal.
        </p>
      </section>
      <TrendStack events={getTrendingFeed()} />
      <section className="space-y-4">
        <div className="signal-kicker">Posts feeding the spike</div>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
