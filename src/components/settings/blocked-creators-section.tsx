"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedCreators } from "@/contexts/BlockedCreatorsContext";

interface BlockedCreator {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export function BlockedCreatorsSection() {
  const { user } = useAuth();
  const { unblockCreator } = useBlockedCreators();
  const [creators, setCreators] = useState<BlockedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCreatorId, setPendingCreatorId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setCreators([]);
      return;
    }

    async function fetchBlocked() {
      try {
        const res = await fetch("/api/user/blocked");
        if (!res.ok) {
          throw new Error("Failed to load blocked creators");
        }
        const data = await res.json();
        setCreators(data.blockedCreators ?? []);
      } catch {
        setError("Failed to load blocked creators");
      } finally {
        setLoading(false);
      }
    }

    fetchBlocked();
  }, [user]);

  async function handleUnblock(creatorId: string) {
    if (pendingCreatorId) return;
    setPendingCreatorId(creatorId);
    setError(null);

    try {
      await unblockCreator(creatorId);
      setCreators((prev) => prev.filter((c) => c.id !== creatorId));
    } catch {
      setError("Failed to unblock");
    } finally {
      setPendingCreatorId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-10 w-10 rounded-lg bg-surface" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-surface" />
              <div className="mt-1 h-3 w-20 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <p className="text-sm text-text-tertiary">You haven&apos;t blocked anyone.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {creators.map((creator) => (
        <div key={creator.id} className="flex items-center gap-3">
          {creator.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.display_name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-sm font-medium text-text-secondary">
              {creator.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {creator.display_name}
            </p>
            <p className="text-xs text-text-tertiary">@{creator.username}</p>
          </div>
          <button
            onClick={() => handleUnblock(creator.id)}
            disabled={pendingCreatorId === creator.id}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-surface hover:text-text-primary transition-colors"
          >
            {pendingCreatorId === creator.id ? "Unblocking..." : "Unblock"}
          </button>
        </div>
      ))}
    </div>
  );
}
