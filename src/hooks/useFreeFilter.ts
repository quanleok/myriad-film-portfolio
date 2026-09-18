"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "myriad:free-only";

export function useFreeFilter() {
  const [freeOnly, setFreeOnlyState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setFreeOnlyState(stored === "true");
      }
    } catch {
      // Ignore storage errors
    } finally {
      setHydrated(true);
    }
  }, []);

  function setFreeOnly(value: boolean) {
    setFreeOnlyState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignore storage errors
    }
  }

  return { freeOnly, setFreeOnly, hydrated };
}
