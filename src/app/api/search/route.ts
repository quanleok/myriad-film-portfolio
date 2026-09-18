import { NextRequest, NextResponse } from "next/server";
import {
  ensureProjectsIndex,
  ensureVideosIndex,
  search,
  type ProjectSearchDocument,
} from "@/lib/meilisearch/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { GENRE_LABELS } from "@/types/video";
import { stripHtmlTags } from "@/lib/utils";

const MEDIA_TYPES = new Set(["video"]);
const VALID_GENRES = new Set(Object.keys(GENRE_LABELS));
const VALID_TYPES = new Set(["projects", "videos"]);

export async function GET(request: NextRequest) {
  const rateLimited = await checkRateLimit("search", 30);
  if (rateLimited) return rateLimited;
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = stripHtmlTags(rawQuery);
  const genre = request.nextUrl.searchParams.get("genre");
  const mediaTypeParam = request.nextUrl.searchParams.get("media_type");
  const mediaType = mediaTypeParam && MEDIA_TYPES.has(mediaTypeParam)
    ? mediaTypeParam
    : null;
  const freeOnly = request.nextUrl.searchParams.get("freeOnly") === "true";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  const typeParam = request.nextUrl.searchParams.get("type") ?? "projects";
  const searchType = VALID_TYPES.has(typeParam) ? typeParam : "projects";

  try {
    if (searchType === "projects") {
      const filters: string[] = [];
      if (genre && VALID_GENRES.has(genre)) filters.push(`genre = "${genre}"`);
      const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

      await ensureProjectsIndex();
      const results = await search<ProjectSearchDocument>("projects", query, {
        filter,
        limit,
        offset,
      });

      // Map to a unified shape for the SearchBar
      const hits = results.hits.map((hit) => ({
        id: hit.id,
        title: hit.title,
        creator_name: hit.creator_name,
        genre: hit.genre,
        thumbnail_url: hit.teaser_thumbnail_url,
        slug: hit.slug,
        type: "project" as const,
      }));

      return NextResponse.json({
        hits,
        estimatedTotalHits: results.estimatedTotalHits,
        query: results.query,
        processingTimeMs: results.processingTimeMs,
      });
    }

    // Legacy video search
    const filters: string[] = [];
    if (genre && VALID_GENRES.has(genre)) filters.push(`genre = "${genre}"`);
    if (mediaType) filters.push(`media_type = "${mediaType}"`);
    if (freeOnly) filters.push("is_premium = false");
    const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

    await ensureVideosIndex();
    const results = await search("videos", query, { filter, limit, offset });
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: "Search unavailable" },
      { status: 503 }
    );
  }
}
