"use client";

import { useEffect, useState } from "react";
import type { FoundingProgramStatus } from "@/lib/founding-program";

interface UseFoundingProgramStatusResult {
  status: FoundingProgramStatus | null;
  loading: boolean;
}

export function useFoundingProgramStatus(
  initialStatus: FoundingProgramStatus | null = null
): UseFoundingProgramStatusResult {
  const [status, setStatus] = useState<FoundingProgramStatus | null>(initialStatus);
  const [loading, setLoading] = useState(initialStatus === null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/founding/status", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as FoundingProgramStatus;
        if (!active) return;
        setStatus(payload);
      } catch {
        // Silent fallback. The existing UI still renders its static CTA copy.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return { status, loading };
}
