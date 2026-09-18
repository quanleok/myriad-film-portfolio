"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Eye, Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TutorialMarkdown } from "@/components/tutorials/tutorial-markdown";
import { TutorialComments } from "@/components/tutorials/tutorial-comments";
import { formatTutorialTagLabel } from "@/lib/tutorials";
import { formatCount, timeAgo } from "@/lib/utils";
import { TUTORIAL_DIFFICULTY_LABELS, type TutorialComment, type TutorialDetail as TutorialDetailType } from "@/types/tutorial";

interface TutorialDetailProps {
  tutorial: TutorialDetailType;
  comments: TutorialComment[];
}

export function TutorialDetail({ tutorial, comments }: TutorialDetailProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(tutorial.viewer_has_liked);
  const [likeCount, setLikeCount] = useState(tutorial.like_count);
  const [viewCount, setViewCount] = useState(tutorial.view_count);
  const [commentCount, setCommentCount] = useState(tutorial.comment_count);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const viewTrackedRef = useRef(false);

  useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;

    fetch(`/api/tutorials/${tutorial.id}/view`, { method: "POST" })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (ok && typeof payload.view_count === "number") {
          setViewCount(payload.view_count);
        }
      })
      .catch(() => {});
  }, [tutorial.id]);

  function handleLike() {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/tutorials/${tutorial.slug}`)}`;
      return;
    }

    setLikeError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/tutorials/${tutorial.id}/like`, { method: "POST" });
        const payload = (await response.json()) as {
          liked?: boolean;
          like_count?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to update like");
        }

        setLiked(Boolean(payload.liked));
        setLikeCount(typeof payload.like_count === "number" ? payload.like_count : likeCount);
      } catch (error) {
        setLikeError(error instanceof Error ? error.message : "Failed to update like");
      }
    });
  }

  const authorHref = tutorial.author.username ? `/creator/${tutorial.author.username}` : "#";
  const authorName = tutorial.author.display_name ?? tutorial.author.username ?? "Unknown creator";

  return (
    <article className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(12,17,17,0.9),rgba(8,11,12,0.98))] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.24)] sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
          <span className="rounded-full border border-brand-500/18 bg-brand-500/10 px-3 py-1 text-brand-200">
            {TUTORIAL_DIFFICULTY_LABELS[tutorial.difficulty]}
          </span>
          <span>{timeAgo(tutorial.created_at)}</span>
          {tutorial.is_featured ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-text-secondary">
              Featured
            </span>
          ) : null}
        </div>

        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-text-primary sm:text-[3.35rem]">
          {tutorial.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          {tutorial.author.username ? (
            <Link href={authorHref} className="font-medium text-text-primary hover:text-brand-200">
              by @{tutorial.author.username}
            </Link>
          ) : (
            <span className="font-medium text-text-primary">by {authorName}</span>
          )}
          <span>{formatTutorialTagLabel(tutorial.category)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tutorial.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tutorials?tag=${encodeURIComponent(tag)}`}
              className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              {formatTutorialTagLabel(tag)}
            </Link>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-text-tertiary">
          <button
            type="button"
            onClick={handleLike}
            className="inline-flex items-center gap-2 transition-colors hover:text-text-primary"
          >
            <Heart size={16} className={liked ? "fill-brand-400 text-brand-400" : "text-brand-300"} />
            {formatCount(likeCount)}
          </button>
          <span className="inline-flex items-center gap-2">
            <Eye size={16} />
            {formatCount(viewCount)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MessageCircle size={16} />
            {formatCount(commentCount)}
          </span>
          {likeError ? <span className="text-role-danger-fg">{likeError}</span> : null}
        </div>

        {tutorial.cover_image_url ? (
          <div className="mt-8 overflow-hidden rounded-[1.6rem] border border-white/8 bg-black/30">
            <Image
              src={tutorial.cover_image_url}
              alt={tutorial.title}
              width={1600}
              height={900}
              className="h-auto w-full object-cover"
              unoptimized
            />
          </div>
        ) : null}

        <div className="mt-8 border-t border-white/8 pt-8">
          <TutorialMarkdown markdown={tutorial.body_markdown} />
        </div>
      </div>

      <div className="mt-8">
        <TutorialComments
          tutorialId={tutorial.id}
          tutorialSlug={tutorial.slug}
          initialComments={comments}
          onCountChange={setCommentCount}
        />
      </div>
    </article>
  );
}
