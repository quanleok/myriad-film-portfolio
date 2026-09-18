"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { timeAgo } from "@/lib/utils";
import type { ProjectDiscussionPost } from "@/components/projects/types";

interface ProjectDiscussionProps {
  projectId: string;
  isLoggedIn: boolean;
}

interface ThreadedPost extends ProjectDiscussionPost {
  replies: ThreadedPost[];
}

function buildThreads(posts: ProjectDiscussionPost[]): ThreadedPost[] {
  const postMap = new Map<string, ThreadedPost>();
  const roots: ThreadedPost[] = [];

  // First pass: create threaded post objects
  for (const post of posts) {
    postMap.set(post.id, { ...post, replies: [] });
  }

  // Second pass: nest replies under parents
  for (const post of posts) {
    const threaded = postMap.get(post.id)!;
    if (post.parent_post_id && postMap.has(post.parent_post_id)) {
      postMap.get(post.parent_post_id)!.replies.push(threaded);
    } else {
      roots.push(threaded);
    }
  }

  // Sort pinned to top, then by original order
  roots.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  return roots;
}

function UserAvatar({ url, name }: { url: string | null | undefined; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-8 w-8 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-page">
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function DiscussionPost({
  post,
  depth,
  onUpvote,
  onReply,
}: {
  post: ThreadedPost;
  depth: number;
  onUpvote: (postId: string) => void;
  onReply: (postId: string) => void;
}) {
  const displayName = post.user_display_name || post.user_username || "Member";
  const indent = depth > 0;

  return (
    <div className={indent ? "ml-6 border-l-2 border-border/50 pl-3" : ""}>
      <article
        className={`rounded-lg border p-3 ${
          post.is_creator_reply
            ? "border-role-success-border bg-role-success-bg/10"
            : "border-border bg-surface"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <UserAvatar url={post.user_avatar_url} name={displayName} />
          <div className="flex flex-1 items-center gap-2 text-xs">
            <span className="font-medium text-text-primary">{displayName}</span>
            {post.is_creator_reply ? (
              <span className="rounded-full border border-role-success-border bg-role-success-bg px-2 py-0.5 text-[10px] uppercase tracking-wide text-role-success-fg">
                Creator
              </span>
            ) : null}
            {post.is_pinned ? (
              <Pin size={11} className="text-brand-400" />
            ) : null}
            <span className="text-text-tertiary">{timeAgo(post.created_at)}</span>
          </div>
        </div>
        <p className="text-sm text-text-secondary whitespace-pre-wrap">{post.body}</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onUpvote(post.id)}
            className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
          >
            <Heart size={13} /> {post.upvote_count_cache ?? 0}
          </button>
          <button
            type="button"
            onClick={() => onReply(post.id)}
            className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
          >
            <MessageCircle size={13} /> Reply
          </button>
        </div>
      </article>
      {post.replies.length > 0 ? (
        <div className="mt-2 space-y-2">
          {post.replies.map((reply) => (
            <DiscussionPost
              key={reply.id}
              post={reply}
              depth={depth + 1}
              onUpvote={onUpvote}
              onReply={onReply}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectDiscussion({ projectId, isLoggedIn }: ProjectDiscussionProps) {
  const [posts, setPosts] = useState<ProjectDiscussionPost[]>([]);
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [newBody, setNewBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshPosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/discussion?sort=${sort}`);
      const payload = (await response.json()) as { posts?: ProjectDiscussionPost[] };
      setPosts(payload.posts ?? []);
    } catch {
      // Silent — posts remain as-is
    } finally {
      setLoading(false);
    }
  }, [projectId, sort]);

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  const threads = useMemo(() => buildThreads(posts), [posts]);

  const handleSubmit = useCallback(async () => {
    if (!newBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: newBody.trim(),
          parent_post_id: replyTo,
        }),
      });
      if (!response.ok) throw new Error("Failed to post");
      setNewBody("");
      setReplyTo(null);
      await refreshPosts();
    } catch {
      // Silent
    } finally {
      setSubmitting(false);
    }
  }, [newBody, projectId, refreshPosts, replyTo, submitting]);

  const handleUpvote = useCallback(
    async (postId: string) => {
      await fetch(`/api/projects/${projectId}/discussion/${postId}/upvote`, { method: "POST" }).catch(() => {});
      await refreshPosts();
    },
    [projectId, refreshPosts]
  );

  const handleReply = useCallback((postId: string) => {
    setReplyTo(postId);
  }, []);

  const replyToPost = replyTo ? posts.find((p) => p.id === replyTo) : null;

  return (
    <div className="surface-edge-glow space-y-3 rounded-xl border border-border bg-page-secondary p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Discussion</h3>
        <PillTabs
          tabs={[
            { value: "top", label: "Top" },
            { value: "newest", label: "Newest" },
          ]}
          value={sort}
          onValueChange={(value) => setSort(value as "newest" | "top")}
        />
      </div>

      {isLoggedIn ? (
        <div className="space-y-2">
          {replyToPost ? (
            <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs text-text-tertiary">
              <span>
                Replying to{" "}
                <span className="font-medium text-text-secondary">
                  {replyToPost.user_display_name || replyToPost.user_username || "Member"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-auto text-text-tertiary hover:text-text-primary"
              >
                ✕
              </button>
            </div>
          ) : null}
          <textarea
            value={newBody}
            onChange={(event) => setNewBody(event.target.value)}
            placeholder={replyTo ? "Write a reply..." : "Ask a question or leave a comment..."}
            className="min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">{newBody.length}/2000</span>
            <Button onClick={() => void handleSubmit()} disabled={!newBody.trim() || submitting}>
              {submitting ? "Posting..." : replyTo ? "Reply" : "Post"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm text-text-tertiary">
          <a href="/login" className="text-brand-600 hover:underline">Sign in</a> to join the discussion.
        </p>
      ) }

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`disc-skeleton-${idx}`} className="skeleton-shimmer h-20 rounded-lg" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Be the first to discuss this project"
            description="Start the conversation with the creator."
          />
        ) : (
          threads.map((thread) => (
            <DiscussionPost
              key={thread.id}
              post={thread}
              depth={0}
              onUpvote={(id) => void handleUpvote(id)}
              onReply={handleReply}
            />
          ))
        )}
      </div>
    </div>
  );
}
