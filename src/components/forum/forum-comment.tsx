"use client";

import { useState } from "react";
import { Heart, Reply } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ForumCommentForm } from "@/components/forum/forum-comment-form";
import type { ForumCommentRecord } from "@/lib/forum";
import { formatCount, timeAgo } from "@/lib/utils";

export function ForumComment({
  comment,
  canReply,
  onReply,
  onToggleLike,
}: {
  comment: ForumCommentRecord;
  canReply: boolean;
  onReply: (body: string, parentId: string) => Promise<void>;
  onToggleLike: (commentId: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/14 p-4">
      <div className="flex items-center gap-3">
        <Avatar
          src={comment.creator?.avatar_url}
          fallback={comment.creator?.display_name ?? comment.creator?.username ?? "C"}
          size="sm"
          className="rounded-[14px] ring-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {comment.creator?.display_name ?? comment.creator?.username ?? "Community"}
          </p>
          <p className="text-xs text-text-tertiary">{timeAgo(comment.created_at)}</p>
        </div>
      </div>

      <div className="mt-3">
        <MarkdownRenderer content={comment.body_markdown} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onToggleLike(comment.id)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
            comment.likedByViewer
              ? "border-[rgba(0,232,123,0.3)] bg-[rgba(0,232,123,0.12)] text-[#dbffee]"
              : "border-white/8 bg-white/4 text-text-secondary hover:text-text-primary"
          }`}
        >
          <Heart size={12} />
          {formatCount(comment.like_count)}
        </button>
        {canReply ? (
          <button
            type="button"
            onClick={() => setReplying((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            <Reply size={12} />
            Reply
          </button>
        ) : null}
      </div>

      {replying ? (
        <div className="mt-4">
          <ForumCommentForm
            placeholder="Write a reply..."
            submitLabel="Reply"
            onCancel={() => setReplying(false)}
            onSubmit={async (body) => {
              await onReply(body, comment.id);
              setReplying(false);
            }}
          />
        </div>
      ) : null}

      {comment.replies?.length ? (
        <div className="mt-4 space-y-3 border-l border-white/8 pl-4">
          {comment.replies.map((reply) => (
            <ForumComment
              key={reply.id}
              comment={reply}
              canReply={false}
              onReply={onReply}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

