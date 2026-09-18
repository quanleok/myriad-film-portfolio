import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchWatchSurfaceData,
  parseWatchSurfaceSort,
  parseWatchSurfaceTab,
} from "@/lib/video-hub";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    const tab = parseWatchSurfaceTab(searchParams.get("tab"));
    const sort = parseWatchSurfaceSort(searchParams.get("sort"));
    const tag = (searchParams.get("tag") ?? "").trim().toLowerCase() || null;
    const aiTool = (searchParams.get("tool") ?? "").trim() || null;
    const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);

    const supabase = await createClient();
    const data = await fetchWatchSurfaceData({
      supabase,
      query,
      tab,
      sort,
      tag,
      aiTool,
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? limit : 20,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[api/video/public] GET error", error);
    return NextResponse.json(
      { error: "Failed to load public clips" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
