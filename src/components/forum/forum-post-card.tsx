"use client";

import Link from "next/link";
import { MessageSquare, Pin, Heart, Eye } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getForumCategoryLabel, type ForumPostSummary } from "@/lib/forum";
import { formatCount, timeAgo } from "@/lib/utils";

export function ForumPostCard({ post }: { post: ForumPostSummary }) {
  return (
    <Link
      href={`/forum/${post.id}`}
      className="group block rounded-[1.4rem] border border-white/8 bg-[rgba(11,13,20,0.92)] px-5 py-4 transition-all hover:-translate-y-[1px] hover:border-[rgba(0,232,123,0.22)] hover:bg-[rgba(15,18,26,0.96)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {post.is_pinned ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(245,185,74,0.24)] bg-[rgba(245,185,74,0.12)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffd98b]">
                <Pin size={12} />
                Pinned
              </span>
            ) : null}
            <Badge variant="default" className="rounded-full">
              {getForumCategoryLabel(post.category)}
            </Badge>
            {post.isSample ? (
              <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                Sample
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white transition-colors group-hover:text-[#dcfff0]">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">{post.excerpt}</p>
        </div>

        <div className="hidden shrink-0 md:block">
          <Avatar
            src={post.creator?.avatar_url}
            fallback={post.creator?.display_name ?? post.creator?.username ?? "F"}
            size="sm"
            className="rounded-[14px] ring-0"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-2">
          <Avatar
            src={post.creator?.avatar_url}
            fallback={post.creator?.display_name ?? post.creator?.username ?? "F"}
            size="xs"
            className="rounded-[10px] ring-0 md:hidden"
          />
          {post.creator?.username ? `@${post.creator.username}` : post.creator?.display_name ?? "Community"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquare size={13} />
          {formatCount(post.comment_count)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Heart size={13} />
          {formatCount(post.like_count)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Eye size={13} />
          {formatCount(post.view_count)}
        </span>
        <span>{timeAgo(post.created_at)}</span>
      </div>
    </Link>
  );
}

