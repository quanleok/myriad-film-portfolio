"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn, formatCount } from "@/lib/utils";
import { CommentIcon, ShareIcon, UpvoteIcon } from "@/components/ui/engagement-icons";

interface VideoCardActionsProps {
  videoId: string;
  title: string;
  initialUpvotes: number;
  initialComments: number;
  initialShares: number;
}

export function VideoCardActions({
  videoId,
  title,
  initialUpvotes,
  initialComments,
  initialShares,
}: VideoCardActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [shares, setShares] = useState(initialShares);
  const [upvoted, setUpvoted] = useState(false);
  const [upvotePending, setUpvotePending] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle");
  const [activeAction, setActiveAction] = useState<"upvote" | "comment" | "share" | null>(null);

  async function handleUpvote() {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (upvotePending) return;

    const supabase = createClient();
    const nextUpvoted = !upvoted;

    setUpvotePending(true);
    setUpvoted(nextUpvoted);
    setUpvotes((count) => (nextUpvoted ? count + 1 : Math.max(0, count - 1)));

    if (nextUpvoted) {
      const { error } = await supabase.from("likes").insert({ user_id: user.id, video_id: videoId });
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
      // Keep quiet on cancelled or failed share attempts.
    } finally {
      setSharePending(false);
    }
  }

  const actionButtonClass =
    "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110c]";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleUpvote}
        onMouseEnter={() => setActiveAction("upvote")}
        onMouseLeave={() => setActiveAction(null)}
        onFocus={() => setActiveAction("upvote")}
        onBlur={() => setActiveAction(null)}
        disabled={upvotePending}
        className={cn(
          actionButtonClass,
          "focus-visible:ring-[#5DCAA5]/55",
          upvoted
            ? "bg-[#5DCAA5]/18 text-[#ebfff7] shadow-[0_12px_28px_rgba(29,158,117,0.22)]"
            : activeAction === "upvote"
              ? "bg-[#0f1d15]/96 text-[#ebfff7] shadow-[0_12px_26px_rgba(29,158,117,0.2)]"
              : "bg-[#0d1812]/92 text-emerald-50/78 hover:bg-[#122119] hover:text-[#ebfff7]",
        )}
        aria-label={`Upvote ${title}`}
        aria-pressed={upvoted}
      >
        <UpvoteIcon
          size={15}
          animated={activeAction === "upvote"}
          active={upvoted}
          reducedMotion={prefersReducedMotion}
        />
        <span>{formatCount(upvotes)}</span>
      </button>

      <Link
        href={`/watch/${videoId}#discussion`}
        onMouseEnter={() => setActiveAction("comment")}
        onMouseLeave={() => setActiveAction(null)}
        onFocus={() => setActiveAction("comment")}
        onBlur={() => setActiveAction(null)}
        className={cn(
          actionButtonClass,
          "focus-visible:ring-[#0F6E56]/55",
          activeAction === "comment"
            ? "bg-[rgba(15,110,86,0.16)] text-[#c4fff0] shadow-[0_12px_28px_rgba(15,110,86,0.18)]"
            : "bg-[#10181a]/92 text-[#d6fcf3]/76 hover:bg-[#152023] hover:text-[#9cf0da]",
        )}
        aria-label={`Open comments for ${title}`}
      >
        <CommentIcon
          size={15}
          animated={activeAction === "comment"}
          reducedMotion={prefersReducedMotion}
        />
        <span>{formatCount(initialComments)}</span>
      </Link>

      <button
        type="button"
        onClick={handleShare}
        onMouseEnter={() => setActiveAction("share")}
        onMouseLeave={() => setActiveAction(null)}
        onFocus={() => setActiveAction("share")}
        onBlur={() => setActiveAction(null)}
        disabled={sharePending}
        className={cn(
          actionButtonClass,
          "focus-visible:ring-[#7F77DD]/55",
          activeAction === "share" || shareFeedback === "copied"
            ? "bg-[#1d173a]/94 text-[#f3f1ff] shadow-[0_12px_28px_rgba(83,74,183,0.24)]"
            : "bg-[#151320]/92 text-[#ebe8ff]/78 hover:bg-[#1c1830] hover:text-[#f3f1ff]",
        )}
        aria-label={`Share ${title}`}
      >
        <ShareIcon
          size={15}
          animated={activeAction === "share"}
          active={shareFeedback === "copied"}
          reducedMotion={prefersReducedMotion}
        />
        <span>{shareFeedback === "copied" ? "Copied" : formatCount(shares)}</span>
      </button>
    </div>
  );
}
