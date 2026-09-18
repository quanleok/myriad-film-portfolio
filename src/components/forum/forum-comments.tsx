"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ForumComment } from "@/components/forum/forum-comment";
import { ForumCommentForm } from "@/components/forum/forum-comment-form";
import type { ForumCommentRecord } from "@/lib/forum";

export function ForumComments({
  postId,
  initialComments,
  disabled = false,
}: {
  postId: string;
  initialComments: ForumCommentRecord[];
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ForumCommentRecord[]>(initialComments);
  const [error, setError] = useState<string | null>(null);

  async function refreshComments() {
    const response = await fetch(`/api/forum/${postId}/comments`);
    const payload = (await response.json()) as { comments?: ForumCommentRecord[]; error?: string };
    if (!response.ok || !payload.comments) {
      throw new Error(payload.error ?? "Could not refresh comments.");
    }
    setComments(payload.comments);
  }

  async function createComment(body: string, parentId?: string) {
    const response = await fetch(`/api/forum/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body_markdown: body, parent_id: parentId ?? null }),
    });
    const payload = (await response.json()) as { comments?: ForumCommentRecord[]; error?: string };

    if (!response.ok || !payload.comments) {
      throw new Error(payload.error ?? "Could not post comment.");
    }

    setComments(payload.comments);
  }

  async function toggleCommentLike(commentId: string) {
    setError(null);
    try {
      const response = await fetch(`/api/forum/${postId}/comments/${commentId}/like`, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not toggle like.");
      }
      await refreshComments();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Could not toggle like.");
    }
  }

  return (
    <section className="rounded-[1.7rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
        Replies ({comments.reduce((sum, comment) => sum + 1 + (comment.replies?.length ?? 0), 0)})
      </p>

      <div className="mt-4 space-y-4">
        {comments.length ? (
          comments.map((comment) => (
            <ForumComment
              key={comment.id}
              comment={comment}
              canReply={Boolean(user)}
              onReply={(body, parentId) => createComment(body, parentId)}
              onToggleLike={toggleCommentLike}
            />
          ))
        ) : (
          <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/14 px-4 py-6 text-sm text-text-secondary">
            No replies yet. Start the thread.
          </div>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-5">
        <ForumCommentForm
          placeholder={user ? "Write a reply..." : "Sign in to join the thread."}
          submitLabel="Post reply"
          disabled={!user || disabled}
          onSubmit={(body) => createComment(body)}
        />
      </div>
    </section>
  );
}

