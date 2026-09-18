"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ForumPostCard } from "@/components/forum/forum-post-card";
import type { ForumPostSummary } from "@/lib/forum";

export function ForumPostList({ posts }: { posts: ForumPostSummary[] }) {
  const [visibleCount, setVisibleCount] = useState(20);
  const visible = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);

  return (
    <div className="space-y-3">
      {visible.length ? (
        visible.map((post) => <ForumPostCard key={post.id} post={post} />)
      ) : (
        <div className="rounded-[1.5rem] border border-white/8 bg-[rgba(10,12,17,0.9)] px-6 py-12 text-center">
          <p className="text-lg font-semibold text-text-primary">No posts match that filter.</p>
          <p className="mt-2 text-sm text-text-secondary">Try another category or start the thread yourself.</p>
        </div>
      )}

      {visibleCount < posts.length ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="secondary" onClick={() => setVisibleCount((count) => count + 20)}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

