"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { MessageSquareReply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { TutorialComment } from "@/types/tutorial";

interface TutorialCommentsProps {
  tutorialId: string;
  tutorialSlug: string;
  initialComments: TutorialComment[];
  onCountChange?: (count: number) => void;
}

function CommentAvatar({ label }: { label: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-brand-500/10 text-sm font-semibold text-brand-200">
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

function countComments(comments: TutorialComment[]) {
  return comments.reduce((total, comment) => total + 1 + comment.replies.length, 0);
}

export function TutorialComments({
  tutorialId,
  tutorialSlug,
  initialComments,
  onCountChange,
}: TutorialCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const commentCount = useMemo(() => countComments(comments), [comments]);

  const refreshComments = useCallback(async () => {
    const response = await fetch(`/api/tutorials/${tutorialId}/comments`, { cache: "no-store" });
    const payload = (await response.json()) as { comments?: TutorialComment[]; error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to refresh comments");
    }

    const nextComments = payload.comments ?? [];
    setComments(nextComments);
    onCountChange?.(countComments(nextComments));
  }, [onCountChange, tutorialId]);

  async function handleSubmit(parentId?: string | null) {
    const nextBody = parentId ? replyBody : body;
    if (!nextBody.trim()) return;

    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/tutorials/${tutorialSlug}`)}`;
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/tutorials/${tutorialId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: nextBody.trim(),
            parent_id: parentId ?? null,
          }),
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to post comment");
        }

        setBody("");
        setReplyBody("");
        setReplyTo(null);
        await refreshComments();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to post comment");
      }
    });
  }

  return (
    <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(8,12,12,0.72)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-text-primary">
            {commentCount} comments
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Ask questions, share what worked, or add a follow-up.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {comments.map((comment) => {
          const commentLabel =
            comment.author.display_name ??
            comment.author.username ??
            "User";

          return (
            <div
              key={comment.id}
              className="rounded-[1.35rem] border border-white/7 bg-black/18 p-4"
            >
              <div className="flex gap-3">
                <CommentAvatar label={commentLabel} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-text-primary">{commentLabel}</span>
                    {comment.author.username ? (
                      <span className="text-text-tertiary">@{comment.author.username}</span>
                    ) : null}
                    <span className="text-text-tertiary">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                    {comment.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReplyTo((current) => (current === comment.id ? null : comment.id))}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary"
                  >
                    <MessageSquareReply size={14} />
                    Reply
                  </button>

                  {replyTo === comment.id ? (
                    <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                      <Textarea
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        placeholder="Write a reply..."
                        className="min-h-[100px]"
                      />
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setReplyTo(null);
                            setReplyBody("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void handleSubmit(comment.id)}
                          loading={isPending}
                        >
                          Post reply
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {comment.replies.length ? (
                    <div className="mt-4 space-y-3 border-l border-white/8 pl-4">
                      {comment.replies.map((reply) => {
                        const replyLabel =
                          reply.author.display_name ??
                          reply.author.username ??
                          "User";

                        return (
                          <div key={reply.id} className="rounded-2xl border border-white/7 bg-white/[0.02] p-3">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium text-text-primary">{replyLabel}</span>
                              {reply.author.username ? (
                                <span className="text-text-tertiary">@{reply.author.username}</span>
                              ) : null}
                              <span className="text-text-tertiary">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                              {reply.body}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a comment..."
          className="min-h-[120px]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {error ? <p className="text-sm text-role-danger-fg">{error}</p> : <span />}
          {user ? (
            <Button type="button" onClick={() => void handleSubmit(null)} loading={isPending}>
              Post
            </Button>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/tutorials/${tutorialSlug}`)}`}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Sign in to comment
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
