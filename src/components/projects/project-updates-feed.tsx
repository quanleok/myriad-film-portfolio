"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, MessageCircle, Pin, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface UpdateItem {
  id: string;
  project_id: string;
  creator_id: string;
  update_type: "text" | "image" | "video" | "progress_proof";
  title: string | null;
  body: string | null;
  media_asset_id: string | null;
  is_progress_proof: boolean;
  review_status: "pending" | "approved" | "rejected" | null;
  is_pinned: boolean;
  like_count_cache: number;
  comment_count_cache: number;
  created_at: string;
}

interface Comment {
  id: string;
  update_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface CreatorInfo {
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
}

const UPDATE_TYPE_LABELS: Record<string, string> = {
  text: "Update",
  image: "Image",
  video: "Video",
  progress_proof: "Progress Proof",
};

const UPDATE_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  image: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  video: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  progress_proof: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
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

interface ProjectUpdatesFeedProps {
  projectId: string;
  creatorId: string;
}

export function ProjectUpdatesFeed({ projectId, creatorId }: ProjectUpdatesFeedProps) {
  const { user } = useAuth();

  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Map<string, Comment[]>>(new Map());
  const [commentInputs, setCommentInputs] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [postingComment, setPostingComment] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchUpdates() {
      try {
        const res = await fetch(`/api/projects/${projectId}/updates`);
        if (!res.ok) return;
        const data = await res.json();
        setUpdates(data.updates ?? []);
        if (data.creator) setCreator(data.creator);
        if (data.userLikedUpdateIds) setLikedIds(new Set(data.userLikedUpdateIds));
      } catch {
        // Silently fail — show empty state
      } finally {
        setLoading(false);
      }
    }
    void fetchUpdates();
  }, [projectId]);

  const handleLike = useCallback(async (updateId: string) => {
    if (!user) return;

    const wasLiked = likedIds.has(updateId);

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(updateId);
      else next.add(updateId);
      return next;
    });
    setUpdates((prev) =>
      prev.map((u) =>
        u.id === updateId
          ? { ...u, like_count_cache: u.like_count_cache + (wasLiked ? -1 : 1) }
          : u
      )
    );

    try {
      const res = await fetch(`/api/projects/${projectId}/updates/${updateId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on error
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(updateId);
        else next.delete(updateId);
        return next;
      });
      setUpdates((prev) =>
        prev.map((u) =>
          u.id === updateId
            ? { ...u, like_count_cache: u.like_count_cache + (wasLiked ? 1 : -1) }
            : u
        )
      );
    }
  }, [likedIds, projectId, user]);

  const toggleComments = useCallback(async (updateId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(updateId)) {
        next.delete(updateId);
      } else {
        next.add(updateId);
      }
      return next;
    });

    // Fetch comments if not cached
    if (!comments.has(updateId)) {
      try {
        const res = await fetch(`/api/projects/${projectId}/updates/${updateId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments((prev) => new Map(prev).set(updateId, data.comments ?? []));
        }
      } catch {
        // Silently fail
      }
    }
  }, [comments, projectId]);

  const postComment = useCallback(async (updateId: string) => {
    if (!user) return;
    const body = commentInputs.get(updateId)?.trim();
    if (!body) return;

    setPostingComment((prev) => new Set(prev).add(updateId));

    // Optimistic: append comment
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      update_id: updateId,
      user_id: user.id,
      body,
      created_at: new Date().toISOString(),
      profile: {
        display_name: null,
        username: null,
        avatar_url: null,
      },
    };

    setComments((prev) => {
      const next = new Map(prev);
      next.set(updateId, [...(next.get(updateId) ?? []), optimisticComment]);
      return next;
    });
    setCommentInputs((prev) => {
      const next = new Map(prev);
      next.set(updateId, "");
      return next;
    });
    setUpdates((prev) =>
      prev.map((u) =>
        u.id === updateId ? { ...u, comment_count_cache: u.comment_count_cache + 1 } : u
      )
    );

    try {
      const res = await fetch(`/api/projects/${projectId}/updates/${updateId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic with real comment
        setComments((prev) => {
          const next = new Map(prev);
          const existing = next.get(updateId) ?? [];
          next.set(
            updateId,
            existing.map((c) => (c.id === optimisticComment.id ? data.comment : c))
          );
          return next;
        });
      }
    } catch {
      // Remove optimistic comment on error
      setComments((prev) => {
        const next = new Map(prev);
        const existing = next.get(updateId) ?? [];
        next.set(updateId, existing.filter((c) => c.id !== optimisticComment.id));
        return next;
      });
      setUpdates((prev) =>
        prev.map((u) =>
          u.id === updateId ? { ...u, comment_count_cache: u.comment_count_cache - 1 } : u
        )
      );
    } finally {
      setPostingComment((prev) => {
        const next = new Set(prev);
        next.delete(updateId);
        return next;
      });
    }
  }, [commentInputs, projectId, user]);

  const handleShare = useCallback(async (updateId: string) => {
    const url = `${window.location.origin}/project/${projectId}?tab=updates#${updateId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: do nothing
    }
  }, [projectId]);

  const bunnyCdn = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No updates yet. The creator will post production updates here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => {
        const isLiked = likedIds.has(update.id);
        const isCommentsOpen = expandedComments.has(update.id);
        const updateComments = comments.get(update.id) ?? [];

        return (
          <div
            key={update.id}
            id={update.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4">
              {creator?.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name ?? "Creator"}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-sm font-medium text-brand-500">
                  {(creator?.display_name ?? "C")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {creator?.display_name ?? creator?.username ?? "Creator"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      UPDATE_TYPE_COLORS[update.update_type] ?? "bg-gray-500/15 text-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {UPDATE_TYPE_LABELS[update.update_type] ?? update.update_type}
                  </span>
                  {update.is_progress_proof && update.review_status === "approved" && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary shrink-0">
                {update.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-brand-500">
                    <Pin size={12} />
                    Pinned
                  </span>
                )}
                <span>{timeAgo(update.created_at)}</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              {update.title && (
                <h4 className="mb-1 text-sm font-semibold">{update.title}</h4>
              )}
              {update.body && (
                <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
                  {update.body}
                </p>
              )}
            </div>

            {/* Media */}
            {update.media_asset_id && update.update_type === "image" && (
              <img
                src={update.media_asset_id}
                alt={update.title ?? "Update image"}
                className="w-full max-h-96 object-cover"
              />
            )}
            {update.media_asset_id && update.update_type === "video" && bunnyCdn && (
              <video
                src={`https://${bunnyCdn}/${update.media_asset_id}/play_720p.mp4`}
                controls
                playsInline
                className="w-full max-h-96"
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 border-t border-border px-4 py-2.5">
              {user ? (
                <button
                  type="button"
                  onClick={() => void handleLike(update.id)}
                  className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
                    isLiked ? "text-role-danger-fg" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Heart size={16} className={isLiked ? "fill-current" : ""} />
                  {update.like_count_cache > 0 ? update.like_count_cache : ""}
                </button>
              ) : (
                <span className="text-xs text-text-tertiary">Sign in to like</span>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={() => void toggleComments(update.id)}
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  <MessageCircle size={16} />
                  {update.comment_count_cache > 0 ? update.comment_count_cache : ""}
                </button>
              ) : (
                <span className="text-xs text-text-tertiary">Sign in to comment</span>
              )}

              <button
                type="button"
                onClick={() => void handleShare(update.id)}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors ml-auto"
              >
                <Share2 size={16} />
              </button>
            </div>

            {/* Comments section */}
            {isCommentsOpen && (
              <div className="border-t border-border px-4 py-3 space-y-3">
                {updateComments.length === 0 && (
                  <p className="text-xs text-text-tertiary">No comments yet. Be the first!</p>
                )}
                {updateComments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    {comment.profile?.avatar_url ? (
                      <img
                        src={comment.profile.avatar_url}
                        alt={comment.profile.display_name ?? "User"}
                        className="h-7 w-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-xs font-medium text-text-tertiary shrink-0">
                        {(comment.profile?.display_name ?? "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {comment.profile?.display_name ?? comment.profile?.username ?? "User"}
                        </span>
                        {comment.user_id === creatorId && (
                          <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-500">
                            Creator
                          </span>
                        )}
                        <span className="text-[10px] text-text-tertiary shrink-0">
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">{comment.body}</p>
                    </div>
                  </div>
                ))}

                {/* Comment input */}
                {user && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={commentInputs.get(update.id) ?? ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => new Map(prev).set(update.id, e.target.value))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void postComment(update.id);
                        }
                      }}
                      placeholder="Add a comment..."
                      maxLength={1000}
                      className="flex-1 rounded-lg border border-border bg-page px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void postComment(update.id)}
                      disabled={
                        postingComment.has(update.id) ||
                        !(commentInputs.get(update.id)?.trim())
                      }
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
