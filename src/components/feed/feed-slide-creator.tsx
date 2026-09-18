"use client";

import { useState } from "react";
import { formatCount } from "@/lib/utils";
import type { ProjectCreatorFull, ProjectCreatorSummary } from "@/components/projects/types";

interface FeedSlideCreatorProps {
  /** Extended creator profile from the feed API */
  creator: ProjectCreatorFull | null;
  /** Basic profile fallback */
  profiles: ProjectCreatorSummary | null;
  thumbnailUrl: string | null;
}

export function FeedSlideCreator({ creator, profiles, thumbnailUrl }: FeedSlideCreatorProps) {
  const displayName = creator?.display_name ?? profiles?.display_name ?? "Unknown creator";
  const avatarUrl = creator?.avatar_url ?? profiles?.avatar_url;
  const username = creator?.username ?? profiles?.username;
  const bio = creator?.bio;
  const followerCount = creator?.follower_count ?? 0;
  const deliveryRecord = creator?.delivery_record_summary;

  const [bioExpanded, setBioExpanded] = useState(false);

  // Build delivery badge text
  let deliveryBadge: { text: string; color: string } | null = null;
  if (deliveryRecord && typeof deliveryRecord === "object") {
    const delivered = (deliveryRecord as Record<string, number>).delivered ?? 0;
    const total = (deliveryRecord as Record<string, number>).total ?? 0;
    if (total > 0) {
      deliveryBadge = {
        text: `${delivered}/${total} delivered`,
        color: delivered === total ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400",
      };
    }
  }
  if (!deliveryBadge) {
    deliveryBadge = { text: "New creator", color: "bg-white/10 text-white/60" };
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Ambient background */}
      {thumbnailUrl ? (
        <>
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl"
          />
          <div className="absolute inset-0 bg-black/75" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
      )}

      {/* Content — centered, above the fixed overlay */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-[240px] text-center">
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-white/20"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white ring-2 ring-white/20">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <h3 className="mt-4 text-[22px] font-bold text-white">{displayName}</h3>
        {username ? (
          <p className="mt-0.5 text-sm text-white/50">@{username}</p>
        ) : null}

        {/* Bio — tap to expand */}
        {bio ? (
          <button
            type="button"
            onClick={() => setBioExpanded((prev) => !prev)}
            className="mt-3 max-w-xs text-center"
          >
            <p
              className={`text-base leading-snug text-white/75 transition-all duration-300 ${
                bioExpanded ? "" : "line-clamp-3"
              }`}
            >
              {bio}
            </p>
            <span className="mt-1 inline-block text-xs text-white/40">
              {bioExpanded ? "Show less" : "Read more"}
            </span>
          </button>
        ) : null}

        {/* Delivery badge */}
        <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${deliveryBadge.color}`}>
          {deliveryBadge.text}
        </span>

        {/* Follower count */}
        <p className="mt-2 text-xs text-white/40">
          {formatCount(followerCount)} follower{followerCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
