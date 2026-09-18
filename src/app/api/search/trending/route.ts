import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ALL_VIDEO_GENRE_LABELS } from "@/types/video";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const FALLBACK_TERMS = [
  "anime",
  "sci-fi shorts",
  "drama",
  "action",
  "fantasy",
  "comedy",
  "mystery",
  "romance",
];

type TrendingSourceRow = Pick<
  Database["public"]["Tables"]["videos"]["Row"],
  "genre" | "tags" | "content_type" | "view_count"
>;

function incrementCount(store: Map<string, number>, term: string, amount: number) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return;
  store.set(normalized, (store.get(normalized) ?? 0) + amount);
}

function normalizeTag(tag: string): string | null {
  const normalized = tag.trim().toLowerCase();
  if (normalized.length < 2) return null;
  if (normalized.length > 40) return null;
  return normalized;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ terms: FALLBACK_TERMS.slice(0, 10) });
    }

    const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("videos")
      .select("genre, tags, content_type, view_count")
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("view_count", { ascending: false })
      .limit(600);

    if (error || !data) {
      return NextResponse.json(
        { terms: FALLBACK_TERMS.slice(0, 10) },
        {
          headers: {
            "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600",
          },
        }
      );
    }

    const termCounts = new Map<string, number>();

    for (const row of data as TrendingSourceRow[]) {
      const engagementWeight = Math.max(1, Math.min(6, Math.round((row.view_count ?? 0) / 2000)));

      const genreLabel = ALL_VIDEO_GENRE_LABELS[row.genre];
      if (genreLabel) {
        incrementCount(termCounts, genreLabel.toLowerCase(), 3 + engagementWeight);
      }

      if (Array.isArray(row.tags)) {
        for (const tag of row.tags.slice(0, 8)) {
          const normalizedTag = normalizeTag(tag);
          if (!normalizedTag) continue;
          incrementCount(termCounts, normalizedTag, 1 + Math.floor(engagementWeight / 2));
        }
      }
    }

    const rankedTerms = Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term);

    const deduped = Array.from(new Set(rankedTerms.concat(FALLBACK_TERMS)))
      .filter((term) => term.trim().length > 0)
      .slice(0, 10);

    return NextResponse.json(
      { terms: deduped },
      {
        headers: {
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
