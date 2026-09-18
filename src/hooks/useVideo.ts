"use client";

import { useState, useCallback } from "react";

interface UseVideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isPreview: boolean;
  showPaywall: boolean;
}

export function useVideo(previewSeconds: number = 180) {
  const [state, setState] = useState<UseVideoState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isPreview: true,
    showPaywall: false,
  });

  const onTimeUpdate = useCallback(
    (currentTime: number) => {
      setState((prev) => {
        if (prev.isPreview && currentTime >= previewSeconds) {
          return { ...prev, currentTime, isPlaying: false, showPaywall: true };
        }
        return { ...prev, currentTime };
      });
    },
    [previewSeconds]
  );

  const onDurationChange = useCallback((duration: number) => {
    setState((prev) => ({ ...prev, duration }));
  }, []);

  const unlockFullVideo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPreview: false,
      showPaywall: false,
      isPlaying: true,
    }));
  }, []);

  const togglePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  return { ...state, onTimeUpdate, onDurationChange, unlockFullVideo, togglePlay };
}
