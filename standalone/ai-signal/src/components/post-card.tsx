import Link from "next/link";
import { MessageCircle, ThumbsUp } from "lucide-react";

import type { FeedPost } from "@/lib/product-model";

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <article className="signal-card rounded-[28px] p-5">
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
        <span>{post.category}</span>
        <span className="h-1 w-1 rounded-full bg-white/30" />
        <span>{post.postType.replace("_", " ")}</span>
      </div>
      <h3 className="mt-3 text-xl font-semibold">{post.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{post.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {post.linkedToolSlugs.map((slug) => (
          <Link key={slug} href={`/tools/${slug}`} className="signal-chip rounded-full px-3 py-1 text-xs text-slate-200">
            {slug}
          </Link>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-5 text-sm text-slate-400">
        <div className="inline-flex items-center gap-2">
          <ThumbsUp className="h-4 w-4" />
          {post.reactionCount.toLocaleString()}
        </div>
        <div className="inline-flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          {post.commentCount.toLocaleString()}
        </div>
        <div className="ml-auto">
          by <Link href={`/people/${post.authorHandle}`} className="signal-link text-slate-200">@{post.authorHandle}</Link>
        </div>
      </div>
    </article>
  );
}
