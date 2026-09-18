"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const DEBOUNCE_MS = 2000;

interface UseStudioAutosaveOptions {
  projectId: string;
  content: string;
  enabled?: boolean;
}

interface UseStudioAutosaveResult {
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

export function useStudioAutosave({
  projectId,
  content,
  enabled = true,
}: UseStudioAutosaveOptions): UseStudioAutosaveResult {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastSavedContentRef = useRef<string>(content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (text: string) => {
      if (text === lastSavedContentRef.current) return;

      setSaving(true);
      setError(null);

      try {
        const res = await fetch(`/api/studio/${projectId}/script`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Save failed (${res.status})`);
        }

        lastSavedContentRef.current = text;
        setLastSaved(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      save(content);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, enabled, save]);

  // Sync ref when content is first loaded (avoid saving initial load)
  useEffect(() => {
    if (!lastSaved) {
      lastSavedContentRef.current = content;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { saving, lastSaved, error };
}
