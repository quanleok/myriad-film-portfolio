"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Share2, Eye } from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ForumComments } from "@/components/forum/forum-comments";
import { ForumPostCard } from "@/components/forum/forum-post-card";
import { getForumCategoryLabel, type ForumPostDetail, type ForumPostSummary } from "@/lib/forum";
import { formatCount, timeAgo } from "@/lib/utils";

export function ForumDetail({
  post,
  similarPosts,
}: {
  post: ForumPostDetail;
  similarPosts: ForumPostSummary[];
}) {
  const [likedByViewer, setLikedByViewer] = useState(post.likedByViewer ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count);

  async function toggleLike() {
    if (post.isSample) return;
    const response = await fetch(`/api/forum/${post.id}/like`, { method: "POST" });
    const payload = (await response.json()) as { liked?: boolean; like_count?: number };
    if (typeof payload.liked === "boolean") setLikedByViewer(payload.liked);
    if (typeof payload.like_count === "number") setLikeCount(payload.like_count);
  }

  async function sharePost() {
    const href = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: post.title, url: href });
      return;
    }
    await navigator.clipboard.writeText(href);
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(112,122,255,0.16),rgba(16,15,26,0.94)_38%,rgba(7,17,12,0.98)_100%)]">
        <VideoHubHeader
          activeTab="forum"
          primaryHref="/forum/new"
          primaryLabel="New post"
          primaryShortLabel="New"
          primaryIcon="plus"
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/forum"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm text-text-primary transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          >
            <ArrowLeft size={15} />
            Back to Forum
          </Link>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_360px]">
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-white/8 bg-[rgba(12,14,20,0.92)] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(127,119,221,0.24)] bg-[rgba(127,119,221,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ddd7ff]">
                    {getForumCategoryLabel(post.category)}
                  </span>
                  {post.is_pinned ? (
                    <span className="rounded-full border border-[rgba(245,185,74,0.24)] bg-[rgba(245,185,74,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd98b]">
                      Pinned
                    </span>
                  ) : null}
                  {post.isSample ? (
                    <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Sample thread
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-semibold tracking-[-0.07em] text-white">
                  {post.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Avatar
                    src={post.creator?.avatar_url}
                    fallback={post.creator?.display_name ?? post.creator?.username ?? "F"}
                    size="md"
                    className="rounded-[16px] ring-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {post.creator?.display_name ?? post.creator?.username ?? "Community"}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {post.creator?.username ? `@${post.creator.username}` : "Community"} · {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button type="button" variant={likedByViewer ? "primary" : "secondary"} onClick={toggleLike} disabled={post.isSample} leftIcon={<Heart size={15} />}>
                    Like ({formatCount(likeCount)})
                  </Button>
                  <Button type="button" variant="secondary" leftIcon={<Share2 size={15} />} onClick={() => void sharePost()}>
                    Share
                  </Button>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-text-secondary">
                    <Eye size={15} />
                    {formatCount(post.view_count)}
                  </div>
                </div>
              </section>

              <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,14,20,0.9)] px-6 py-5">
                <MarkdownRenderer content={post.body_markdown} />
              </section>

              <ForumComments postId={post.id} initialComments={post.comments} disabled={post.isSample} />
            </div>

            <div className="space-y-6">
              {post.tags.length ? (
                <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Tags
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {similarPosts.length ? (
                <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Similar threads
                  </p>
                  <div className="mt-4 space-y-4">
                    {similarPosts.map((item) => (
                      <ForumPostCard key={item.id} post={item} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
