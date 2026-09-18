"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  like_count: number;
  is_pinned: boolean;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  replies?: Comment[];
  userLiked?: boolean;
  userDisliked?: boolean;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function CommentSection({
  videoId,
  onCountChange,
}: {
  videoId: string;
  onCountChange?: (count: number) => void;
}) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const fetchComments = useCallback(async () => {
    setFetchError(false);
    try {
    const supabase = createClient();
    const { data } = await supabase
      .from("comments")
      .select(
        `
        id, user_id, video_id, parent_id, body, created_at, like_count, is_pinned,
        profiles!comments_user_id_fkey ( display_name, avatar_url )
      `
      )
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });

    if (!data) { setFetchError(true); return; }

    const typed = data as unknown as Comment[];

    // Fetch user's comment likes
    let userLikesMap: Record<string, boolean> = {};
    if (user) {
      const commentIds = typed.map((c) => c.id);
      if (commentIds.length > 0) {
        const { data: likesData } = await supabase
          .from("comment_likes")
          .select("comment_id, is_like")
          .eq("user_id", user.id)
          .in("comment_id", commentIds);

        for (const l of likesData ?? []) {
          userLikesMap[l.comment_id] = l.is_like;
        }
      }
    }

    // Separate top-level comments and replies
    const topLevel: Comment[] = [];
    const replyMap = new Map<string, Comment[]>();

    for (const c of typed) {
      c.userLiked = userLikesMap[c.id] === true;
      c.userDisliked = userLikesMap[c.id] === false;

      if (c.parent_id) {
        const arr = replyMap.get(c.parent_id) || [];
        arr.push(c);
        replyMap.set(c.parent_id, arr);
      } else {
        topLevel.push(c);
      }
    }

    // Sort: pinned first, then by created_at desc
    topLevel.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    for (const c of topLevel) {
      const replies = replyMap.get(c.id) || [];
      replies.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      c.replies = replies;
    }

    setComments(topLevel);
    const totalCount = typed.length;
    onCountChange?.(totalCount);
    } catch {
      setFetchError(true);
    }
  }, [onCountChange, videoId, user]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  async function handleSubmit(parentId: string | null = null) {
    if (!user) return;
    const text = parentId ? replyBody : body;
    if (!text.trim()) return;

    setActionError(null);
    setSubmitting(true);

    const optimisticComment: Comment = {
      id: crypto.randomUUID(),
      user_id: user.id,
      video_id: videoId,
      parent_id: parentId,
      body: text.trim(),
      created_at: new Date().toISOString(),
      like_count: 0,
      is_pinned: false,
      profiles: {
        display_name: profile?.display_name ?? "You",
        avatar_url: profile?.avatar_url ?? null,
      },
    };

    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), optimisticComment] }
            : c
        )
      );
      setExpandedReplies((prev) => new Set(prev).add(parentId));
      setReplyBody("");
      setReplyTo(null);
    } else {
      setComments((prev) => [{ ...optimisticComment, replies: [] }, ...prev]);
      setBody("");
    }

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, parentId, body: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "Failed to post comment");
        setSubmitting(false);
        fetchComments();
        return;
      }
    } catch {
      setActionError("Failed to post comment");
      setSubmitting(false);
      fetchComments();
      return;
    }

    fetch("/api/notifications/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, parentId }),
    }).catch(() => {});

    setSubmitting(false);
    fetchComments();
  }

  async function handleDelete(commentId: string, parentId: string | null) {
    setActionError(null);
    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: (c.replies || []).filter((r) => r.id !== commentId),
              }
            : c
        )
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }

    const supabase = createClient();
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) {
      setActionError("Failed to delete comment");
      fetchComments();
    }
  }

  async function handleCommentLike(commentId: string, isLike: boolean) {
    if (!user) return;
    setActionError(null);

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return applyLikeOptimistic(c, isLike);
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId ? applyLikeOptimistic(r, isLike) : r
            ),
          };
        }
        return c;
      })
    );

    const response = await fetch(`/api/comments/${commentId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLike }),
    });
    if (!response.ok) {
      setActionError("Failed to update reaction");
      fetchComments();
    }
  }

  function applyLikeOptimistic(comment: Comment, isLike: boolean): Comment {
    const wasLiked = comment.userLiked;
    const wasDisliked = comment.userDisliked;

    if (isLike) {
      if (wasLiked) {
        return {
          ...comment,
          userLiked: false,
          like_count: Math.max(0, comment.like_count - 1),
        };
      }
      return {
        ...comment,
        userLiked: true,
        userDisliked: false,
        like_count: comment.like_count + 1,
      };
    } else {
      if (wasDisliked) {
        return { ...comment, userDisliked: false };
      }
      return {
        ...comment,
        userDisliked: true,
        userLiked: false,
        like_count: wasLiked
          ? Math.max(0, comment.like_count - 1)
          : comment.like_count,
      };
    }
  }

  function CommentItem({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) {
    const avatar = comment.profiles?.avatar_url;
    const name = comment.profiles?.display_name ?? "Anonymous";
    const initial = name[0]?.toUpperCase() ?? "?";
    const replyCount = comment.replies?.length ?? 0;
    const isExpanded = expandedReplies.has(comment.id);
    const firstReplyAuthor =
      comment.replies?.[0]?.profiles?.display_name ?? "";

    return (
      <div className={isReply ? "ml-10 mt-3" : ""}>
        {/* Pinned badge */}
        {comment.is_pinned && !isReply && (
          <div className="mb-1 flex items-center gap-1 text-xs text-text-tertiary">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
            </svg>
            Pinned by creator
          </div>
        )}

        <div
          className={`flex gap-3 ${
            comment.is_pinned && !isReply
              ? "rounded-lg bg-text-primary/5 p-3"
              : ""
          }`}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="h-8 w-8 rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-xs font-medium text-page flex-shrink-0">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {name}
              </span>
              <span className="text-xs text-text-tertiary">
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap break-words">
              {comment.body}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-1">
              {/* Like */}
              <button
                type="button"
                onClick={() => handleCommentLike(comment.id, true)}
                disabled={!user}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  comment.userLiked
                    ? "text-brand-400"
                    : "text-text-tertiary hover:text-text-primary"
                } disabled:cursor-default`}
                title={user ? "Like" : "Log in to like"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={comment.userLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 10v12" />
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
                {comment.like_count > 0 && (
                  <span>{comment.like_count}</span>
                )}
              </button>

              {/* Dislike */}
              <button
                type="button"
                onClick={() => handleCommentLike(comment.id, false)}
                disabled={!user}
                className={`text-xs transition-colors ${
                  comment.userDisliked
                    ? "text-red-400"
                    : "text-text-tertiary hover:text-text-primary"
                } disabled:cursor-default`}
                title={user ? "Dislike" : "Log in to dislike"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={comment.userDisliked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 14V2" />
                  <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                </svg>
              </button>

              {/* Reply */}
              {!isReply && user && (
                <button
                  type="button"
                  className="text-xs text-text-tertiary hover:text-text-primary/70"
                  onClick={() =>
                    setReplyTo(replyTo === comment.id ? null : comment.id)
                  }
                >
                  Reply
                </button>
              )}

              {/* Delete */}
              {user?.id === comment.user_id && (
                <button
                  type="button"
                  className="text-xs text-red-400/60 hover:text-red-400"
                  onClick={() =>
                    handleDelete(comment.id, comment.parent_id)
                  }
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reply input */}
        {replyTo === comment.id && (
          <div className="ml-11 mt-2 flex gap-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              size="sm"
              onClick={() => handleSubmit(comment.id)}
              disabled={submitting || !replyBody.trim()}
            >
              Reply
            </Button>
          </div>
        )}

        {/* Collapsible replies toggle */}
        {!isReply && replyCount > 0 && (
          <button
            type="button"
            onClick={() => toggleReplies(comment.id)}
            className="ml-11 mt-2 flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
            {firstReplyAuthor && !isExpanded && (
              <span className="text-text-tertiary font-normal">
                {" "}
                from {firstReplyAuthor}
                {replyCount > 1 && " and others"}
              </span>
            )}
          </button>
        )}

        {/* Render replies when expanded */}
        {!isReply && isExpanded &&
          comment.replies?.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-text-primary">
        Comments (
        {comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0)})
      </h3>

      {fetchError && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <span>Failed to load comments</span>
          <button type="button" onClick={fetchComments} className="ml-3 shrink-0 rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors">Retry</button>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {user ? (
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
            {profile?.display_name?.[0]?.toUpperCase() ?? "Y"}
          </div>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleSubmit(null)}
                disabled={submitting || !body.trim()}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-tertiary">
          <Link href="/login" className="text-brand-400 hover:underline">
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      <div className="space-y-5">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
        {comments.length === 0 && (
          <div className="rounded-xl border border-border bg-page-secondary px-4 py-8 text-center">
            <p className="text-3xl">&#128172;</p>
            <p className="mt-2 text-base font-medium text-text-primary">
              Be the first to comment
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              Share your thoughts on this video.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
