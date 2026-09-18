"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import type { ResourceCommentRecord } from "@/lib/resources";

interface ResourceCommentsProps {
  resourceId: string;
  comments: ResourceCommentRecord[];
  onCommentsUpdate: (comments: ResourceCommentRecord[]) => void;
  disabled?: boolean;
}

export function ResourceComments({
  resourceId,
  comments,
  onCommentsUpdate,
  disabled = false,
}: ResourceCommentsProps) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitComment() {
    if (!body.trim() || submitting || disabled) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/resources/${resourceId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const payload = (await response.json()) as {
        comments?: ResourceCommentRecord[];
        error?: string;
      };

      if (!response.ok || !payload.comments) {
        throw new Error(payload.error ?? "Could not post comment.");
      }

      onCommentsUpdate(payload.comments);
      setBody("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not post comment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[1.7rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
        Comments ({comments.length})
      </p>

      <div className="mt-4 space-y-4">
        {comments.length ? (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-[1rem] border border-white/8 bg-black/14 p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={comment.creator?.avatar_url}
                  fallback={comment.creator?.display_name ?? comment.creator?.username ?? "C"}
                  size="sm"
                  className="rounded-[14px] ring-0"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {comment.creator?.display_name ?? "Community creator"}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-text-secondary">
                {comment.body}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/14 px-4 py-6 text-sm text-text-secondary">
            No comments yet. Share how the pack worked in your project.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-[1rem] border border-white/8 bg-black/12 p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={user ? "Write a comment..." : "Sign in to join the discussion."}
          disabled={!user || disabled}
          className="min-h-[110px] w-full resize-y rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-[rgba(0,232,123,0.3)]"
        />
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={submitComment} disabled={!user || !body.trim() || disabled} loading={submitting}>
            Post
          </Button>
        </div>
      </div>
    </section>
  );
}
