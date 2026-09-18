"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Video = Database["public"]["Tables"]["videos"]["Row"];

export function useCreator(creatorId: string | undefined) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId) return;

    const supabase = createClient();

    async function fetchCreatorContent() {
      const { data } = await supabase
        .from("videos")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("created_at", { ascending: false });

      setVideos(data ?? []);
      setLoading(false);
    }

    fetchCreatorContent();
  }, [creatorId]);

  return { videos, loading };
}
