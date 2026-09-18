"use client";

import { useState } from "react";
import { CommentSection } from "@/components/video/comment-section";
import { ClipEngagementBar } from "@/components/video/clip-engagement-bar";

interface ClipDiscussionPanelProps {
  videoId: string;
  title: string;
  initialUpvotes: number;
  initialComments: number;
  initialShares: number;
  initiallyUpvoted: boolean;
}

export function ClipDiscussionPanel({
  videoId,
  title,
  initialUpvotes,
  initialComments,
  initialShares,
  initiallyUpvoted,
}: ClipDiscussionPanelProps) {
  const [commentCount, setCommentCount] = useState(initialComments);

  return (
    <div className="space-y-5">
      <ClipEngagementBar
        videoId={videoId}
        title={title}
        initialUpvotes={initialUpvotes}
        commentCount={commentCount}
        initialShares={initialShares}
        initiallyUpvoted={initiallyUpvoted}
      />

      <section
        id="discussion"
        className="scroll-mt-24 rounded-[24px] border border-white/8 bg-[#060908] p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Discussion
          </h2>
          <span className="text-sm text-text-tertiary">{commentCount}</span>
        </div>
        <CommentSection videoId={videoId} onCountChange={setCommentCount} />
      </section>
    </div>
  );
}
