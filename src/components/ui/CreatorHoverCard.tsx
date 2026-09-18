"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCount } from "@/lib/utils";
import { Eye, Users, Film, UserCheck } from "lucide-react";
import { CreatorTrustBadges } from "@/components/creator/creator-trust-badges";
import {
  formatCreatorDeliverySummary,
  resolveCreatorTrust,
} from "@/lib/creator-trust";

interface CreatorData {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_founding_creator: boolean | null;
  released_project_count: number;
  follower_count: number;
  subscriber_count: number;
  total_views: number;
  video_count: number;
  created_at: string;
}

// Simple in-memory cache
const cache: Record<string, { data: CreatorData; ts: number }> = {};
const CACHE_TTL = 60_000; // 1 minute

interface CreatorHoverCardProps {
  creatorId: string;
  children: React.ReactNode;
  className?: string;
}

export function CreatorHoverCard({ creatorId, children, className }: CreatorHoverCardProps) {
  const [show, setShow] = useState(false);
  const [data, setData] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const cached = cache[creatorId];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/${creatorId}`);
      if (res.ok) {
        const json = await res.json();
        cache[creatorId] = { data: json, ts: Date.now() };
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  const handleEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    timerRef.current = setTimeout(() => {
      setShow(true);
      fetchData();
    }, 400);
  }, [fetchData]);

  const handleLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setShow(false);
    }, 200);
  }, []);

  const handleCardEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const handleCardLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setShow(false);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`relative inline-block ${className ?? ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}

      {show && (
        <div
          ref={cardRef}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
          className="absolute left-0 top-full z-50 mt-2 w-72 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="surface-edge-glow overflow-hidden rounded-xl border border-border bg-page shadow-[var(--role-surface-elev-2)]">
            {/* Banner */}
            <div className="h-16 bg-gradient-to-r from-role-bg-surface-active via-role-bg-surface-hover to-role-bg-surface relative overflow-hidden">
              {data?.banner_url && (
                <Image
                  src={data.banner_url}
                  alt=""
                  fill
                  className="object-cover opacity-80"
                />
              )}
            </div>

            {/* Content */}
            <div className="px-4 pb-4 -mt-5 relative">
              {/* Avatar */}
              <div className="mb-2">
                {data?.avatar_url ? (
                  <Image
                    src={data.avatar_url}
                    alt={data.display_name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-lg object-cover ring-2 ring-page"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover ring-2 ring-page text-sm font-medium text-text-secondary">
                    {data?.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>

              {loading && !data ? (
                <div className="space-y-2 py-2">
                  <div className="h-4 w-24 rounded bg-surface animate-pulse" />
                  <div className="h-3 w-16 rounded bg-surface animate-pulse" />
                </div>
              ) : data ? (
                <>
                  {(() => {
                    const trust = resolveCreatorTrust({
                      isFoundingCreator: data.is_founding_creator,
                      releasedProjectCount: data.released_project_count,
                    });

                    return (
                      <>
                        {/* Name + badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/creator/${data.username}`}
                            className="font-display text-sm font-semibold text-text-primary transition-colors hover:text-text-primary"
                          >
                            {data.display_name}
                          </Link>
                        </div>

                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="text-xs text-text-tertiary">@{data.username}</span>
                        </div>

                        <CreatorTrustBadges trust={trust} className="mt-2" />

                        <p className="mt-2 text-[11px] text-text-tertiary">
                          {formatCreatorDeliverySummary(trust)}
                        </p>

                        {/* Bio */}
                        {data.bio && (
                          <p className="mt-2 text-xs text-text-secondary line-clamp-2">{data.bio}</p>
                        )}

                        {/* Stats grid */}
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          <StatItem icon={<Users size={13} />} value={formatCount(data.follower_count)} label="Followers" />
                          <StatItem icon={<UserCheck size={13} />} value={formatCount(data.subscriber_count)} label="Subs" />
                          <StatItem icon={<Eye size={13} />} value={formatCount(data.total_views)} label="Views" />
                          <StatItem icon={<Film size={13} />} value={String(data.video_count)} label="Videos" />
                        </div>

                        {/* View profile link */}
                        <Link
                          href={`/creator/${data.username}`}
                          className="mt-3 block w-full rounded-lg border border-role-border-subtle bg-surface py-1.5 text-center text-xs font-medium text-text-primary transition-colors hover:border-role-border-strong hover:bg-surface-hover"
                        >
                          View Full Profile
                        </Link>
                      </>
                    );
                  })()}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-text-tertiary">{icon}</span>
      <span className="text-xs font-semibold text-text-primary">{value}</span>
      <span className="text-[9px] text-text-tertiary">{label}</span>
    </div>
  );
}
