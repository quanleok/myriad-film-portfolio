"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn, formatCount } from "@/lib/utils";
import { ReportButton } from "@/components/video/ReportButton";
import { CommentIcon, ShareIcon, UpvoteIcon } from "@/components/ui/engagement-icons";

interface ClipEngagementBarProps {
  videoId: string;
  title: string;
  initialUpvotes: number;
  commentCount: number;
  initialShares: number;
  initiallyUpvoted?: boolean;
}

function ActionPill({
  children,
  active = false,
  tone = "neutral",
  highlighted = false,
  className = "",
}: {
  children: React.ReactNode;
  active?: boolean;
  tone?: "neutral" | "upvote" | "comment" | "share";
  highlighted?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "upvote"
      ? active
        ? "border-[#5DCAA5]/50 bg-[#5DCAA5]/14 text-[#e6fff6]"
        : highlighted
          ? "border-[#5DCAA5]/35 bg-[#5DCAA5]/10 text-[#c7f4e5]"
          : "border-white/10 bg-white/[0.04] text-white/82 hover:border-[#5DCAA5]/28 hover:bg-[#0f1b15] hover:text-[#d6fff0]"
      : tone === "comment"
        ? highlighted
          ? "border-[#0F6E56]/40 bg-[rgba(15,110,86,0.12)] text-[#9ae7d3]"
          : "border-white/10 bg-white/[0.04] text-white/82 hover:border-[#0F6E56]/26 hover:bg-[rgba(15,110,86,0.08)] hover:text-[#9ae7d3]"
        : tone === "share"
          ? highlighted
            ? "border-[#7F77DD]/38 bg-[#7F77DD]/12 text-[#ece8ff]"
            : "border-white/10 bg-white/[0.04] text-white/82 hover:border-[#7F77DD]/28 hover:bg-[#181427] hover:text-[#ece8ff]"
          : active
            ? "border-emerald-300/45 bg-emerald-300/14 text-emerald-50"
            : "border-white/10 bg-white/[0.04] text-white/82 hover:border-white/18 hover:bg-white/[0.08] hover:text-white";

  return (
    <span
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ClipEngagementBar({
  videoId,
  title,
  initialUpvotes,
  commentCount,
  initialShares,
  initiallyUpvoted = false,
}: ClipEngagementBarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [shares, setShares] = useState(initialShares);
  const [upvoted, setUpvoted] = useState(initiallyUpvoted);
  const [upvotePending, setUpvotePending] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle");
  const [activeAction, setActiveAction] = useState<"upvote" | "comment" | "share" | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  async function handleUpvote() {
    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
      return;
    }

    if (upvotePending) return;

    const supabase = createClient();
    const nextUpvoted = !upvoted;
    setUpvotePending(true);
    setUpvoted(nextUpvoted);
    setUpvotes((count) => (nextUpvoted ? count + 1 : Math.max(0, count - 1)));

    if (nextUpvoted) {
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: user.id, video_id: videoId });
      if (error) {
        setUpvoted(false);
        setUpvotes((count) => Math.max(0, count - 1));
      }
    } else {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("video_id", videoId);
      if (error) {
        setUpvoted(true);
        setUpvotes((count) => count + 1);
      }
    }

    setUpvotePending(false);
  }

  async function handleShare() {
    if (sharePending) return;

    const shareUrl = `${window.location.origin}/watch/${videoId}`;
    setSharePending(true);

    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback("copied");
        window.setTimeout(() => setShareFeedback("idle"), 1600);
      }

      const response = await fetch("/api/video/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (response.ok) {
        setShares((count) => count + 1);
      }
    } catch {
      // Keep share quiet on failed attempts.
    } finally {
      setSharePending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleUpvote}
        onMouseEnter={() => setActiveAction("upvote")}
        onMouseLeave={() => setActiveAction(null)}
        onFocus={() => setActiveAction("upvote")}
        onBlur={() => setActiveAction(null)}
        disabled={upvotePending}
        className="disabled:opacity-70 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DCAA5]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040709]"
        aria-label={`Upvote ${title}`}
        aria-pressed={upvoted}
      >
        <ActionPill active={upvoted} tone="upvote" highlighted={activeAction === "upvote"}>
          <UpvoteIcon
            size={16}
            animated={activeAction === "upvote"}
            active={upvoted}
            reducedMotion={prefersReducedMotion}
          />
          <span>Upvote</span>
          <span className="text-white/58">·</span>
          <span>{formatCount(upvotes)}</span>
        </ActionPill>
      </button>

      <Link
        href="#discussion"
        aria-label={`Open comments for ${title}`}
        onMouseEnter={() => setActiveAction("comment")}
        onMouseLeave={() => setActiveAction(null)}
        onFocus={() => setActiveAction("comment")}
        onBlur={() => setActiveAction(null)}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040709]"
      >
        <ActionPill tone="comment" highlighted={activeAction === "comment"}>
          <CommentIcon
            size={16}
            animated={activeAction === "comment"}
            reducedMotion={prefersReducedMotion}
          />
          <span>Comments</span>
          <span className="text-white/58">·</span>
          <span>{formatCount(commentCount)}</span>
        </ActionPill>
      </Link>

      <button
        type="button"
        onClick={handleShare}
        onMouseEnter={() => setActiveAction("share")}
        onMouseLeave={() => setActiveAction(null)}
        onFocus={() => setActiveAction("share")}
        onBlur={() => setActiveAction(null)}
        disabled={sharePending}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F77DD]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040709]"
        aria-label={`Share ${title}`}
      >
        <ActionPill
          tone="share"
          highlighted={activeAction === "share" || shareFeedback === "copied"}
        >
          <ShareIcon
            size={16}
            animated={activeAction === "share"}
            active={shareFeedback === "copied"}
            reducedMotion={prefersReducedMotion}
          />
          <span>Share</span>
          <span className="text-white/58">·</span>
          <span>{shareFeedback === "copied" ? "Copied" : formatCount(shares)}</span>
        </ActionPill>
      </button>

      <ReportButton videoId={videoId} compact className="shrink-0" />
    </div>
  );
}
