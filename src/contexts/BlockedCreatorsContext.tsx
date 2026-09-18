"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface BlockedCreatorsContextType {
  blockedIds: string[];
  isBlocked: (creatorId: string) => boolean;
  blockCreator: (creatorId: string) => Promise<void>;
  unblockCreator: (creatorId: string) => Promise<void>;
}

const BlockedCreatorsContext = createContext<BlockedCreatorsContextType>({
  blockedIds: [],
  isBlocked: () => false,
  blockCreator: async () => {},
  unblockCreator: async () => {},
});

export function BlockedCreatorsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setBlockedIds([]);
      return;
    }

    async function fetchBlocked() {
      const res = await fetch("/api/user/blocked");
      if (res.ok) {
        const data = await res.json();
        setBlockedIds(data.blockedIds ?? []);
      }
    }

    fetchBlocked();
  }, [user]);

  const isBlocked = useCallback(
    (creatorId: string) => blockedIds.includes(creatorId),
    [blockedIds]
  );

  const blockCreator = useCallback(async (creatorId: string) => {
    setBlockedIds((prev) =>
      prev.includes(creatorId) ? prev : [...prev, creatorId]
    );

    const res = await fetch("/api/user/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });

    if (!res.ok) {
      setBlockedIds((prev) => prev.filter((id) => id !== creatorId));
      throw new Error("Failed to block creator");
    }
  }, []);

  const unblockCreator = useCallback(async (creatorId: string) => {
    setBlockedIds((prev) => prev.filter((id) => id !== creatorId));

    const res = await fetch("/api/user/block", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });

    if (!res.ok) {
      setBlockedIds((prev) =>
        prev.includes(creatorId) ? prev : [...prev, creatorId]
      );
      throw new Error("Failed to unblock creator");
    }
  }, []);

  return (
    <BlockedCreatorsContext.Provider value={{ blockedIds, isBlocked, blockCreator, unblockCreator }}>
      {children}
    </BlockedCreatorsContext.Provider>
  );
}

export function useBlockedCreators() {
  return useContext(BlockedCreatorsContext);
}
