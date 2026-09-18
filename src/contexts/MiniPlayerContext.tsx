"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";

interface MiniPlayerState {
  videoId: string;
  title: string;
  creatorName: string;
  thumbnailUrl: string | null;
  streamUrl: string;
  currentTime: number;
}

interface MiniPlayerContextValue {
  miniPlayer: MiniPlayerState | null;
  activate: (state: MiniPlayerState) => void;
  deactivate: () => void;
  updateTime: (time: number) => void;
}

const MiniPlayerContext = createContext<MiniPlayerContextValue>({
  miniPlayer: null,
  activate: () => {},
  deactivate: () => {},
  updateTime: () => {},
});

export function useMiniPlayer() {
  return useContext(MiniPlayerContext);
}

export function MiniPlayerProvider({ children }: { children: React.ReactNode }) {
  const [miniPlayer, setMiniPlayer] = useState<MiniPlayerState | null>(null);

  const activate = useCallback((state: MiniPlayerState) => {
    setMiniPlayer(state);
  }, []);

  const deactivate = useCallback(() => {
    setMiniPlayer(null);
  }, []);

  const updateTime = useCallback((time: number) => {
    setMiniPlayer((prev) => (prev ? { ...prev, currentTime: time } : null));
  }, []);

  const value = useMemo(
    () => ({ miniPlayer, activate, deactivate, updateTime }),
    [miniPlayer, activate, deactivate, updateTime]
  );

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
    </MiniPlayerContext.Provider>
  );
}
