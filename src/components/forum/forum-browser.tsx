"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { ForumPostList } from "@/components/forum/forum-post-list";
import { ForumSidebar } from "@/components/forum/forum-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  filterAndSortForumPosts,
  getForumCategoryCounts,
  type ForumCategory,
  type ForumPostSummary,
  type ForumSort,
} from "@/lib/forum";

export function ForumBrowser({
  posts,
  initialQuery,
  initialCategory,
  initialSort,
}: {
  posts: ForumPostSummary[];
  initialQuery: string;
  initialCategory: ForumCategory | "all";
  initialSort: ForumSort;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<ForumCategory | "all">(initialCategory);
  const [sort, setSort] = useState<ForumSort>(initialSort);

  const filteredPosts = useMemo(
    () => filterAndSortForumPosts({ posts, query, category, sort }),
    [posts, query, category, sort]
  );
  const counts = useMemo(() => getForumCategoryCounts(posts), [posts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    if (sort !== "latest") params.set("sort", sort);
    const next = params.toString();
    router.replace(next ? `/forum?${next}` : "/forum", { scroll: false });
  }, [query, category, sort, router]);

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(112,122,255,0.18),rgba(16,15,26,0.94)_38%,rgba(7,17,12,0.98)_100%)]">
        <VideoHubHeader
          activeTab="forum"
          primaryHref="/forum/new"
          primaryLabel="New post"
          primaryShortLabel="New"
          primaryIcon="plus"
        />

        <main className="mx-auto max-w-[min(1720px,100vw)] px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-6 overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(12,18,27,0.94),rgba(8,10,16,0.98))] p-6 shadow-[0_28px_72px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#b7b4ff]">
                  Community forum
                </p>
                <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-white">
                  Threads for workflows, feedback, fixes, and practical AI film craft.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
                  Ask sharper questions, publish useful breakdowns, and keep reusable answers where the next creator can find them.
                </p>
              </div>

              <div className="w-full max-w-xl">
                <div className="rounded-[1.5rem] border border-[rgba(127,119,221,0.18)] bg-[rgba(9,14,22,0.88)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search threads, tags, creators..."
                      className="h-12 rounded-[1rem] border-[rgba(127,119,221,0.16)] bg-[rgba(255,255,255,0.03)]"
                    />
                    <Button
                      type="button"
                      className="h-12 rounded-[1rem] bg-[#00e87b] px-5 text-[#04150d] hover:bg-[#23f495]"
                      leftIcon={<Search size={16} />}
                    >
                      Search
                    </Button>
                    <Button
                      type="button"
                      className="h-12 rounded-[1rem] border-[rgba(255,255,255,0.1)] bg-[rgba(127,119,221,0.18)] px-5 text-white hover:bg-[rgba(127,119,221,0.28)]"
                      leftIcon={<Plus size={16} />}
                      onClick={() => router.push("/forum/new")}
                    >
                      New
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="hidden xl:block">
              <ForumSidebar
                counts={counts}
                category={category}
                onCategoryChange={setCategory}
                sort={sort}
                onSortChange={setSort}
              />
            </div>

            <div className="space-y-5">
              <div className="xl:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCategory("all")}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      category === "all"
                        ? "bg-[rgba(0,232,123,0.16)] text-white"
                        : "border border-white/8 bg-[rgba(15,16,24,0.9)] text-text-secondary"
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(counts).map(([key, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key as ForumCategory)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        category === key
                          ? "bg-[rgba(127,119,221,0.18)] text-white"
                          : "border border-white/8 bg-[rgba(15,16,24,0.9)] text-text-secondary"
                      }`}
                    >
                      {key.replace("_", " ")} <span className="text-text-tertiary">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    {sort === "latest" ? "Latest" : sort === "popular" ? "Popular" : "Most liked"}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {filteredPosts.length} threads in the current view.
                  </p>
                </div>
                <Link
                  href="/forum/new"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-[rgba(255,255,255,0.08)] xl:hidden"
                >
                  <Plus size={15} />
                  New post
                </Link>
              </div>

              <ForumPostList posts={filteredPosts} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

