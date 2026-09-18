import { NextRequest, NextResponse } from "next/server";

import { categories } from "@/lib/sample-data";
import { getLeaderboard } from "@/lib/ranking/score";
import type { CategorySlug, LeaderboardLens } from "@/lib/product-model";

export function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") as CategorySlug | null;
  const lens = (request.nextUrl.searchParams.get("lens") as LeaderboardLens | null) ?? "overall";

  if (category) {
    return NextResponse.json({
      category,
      lens,
      entries: getLeaderboard(category, lens),
      persisted: false,
    });
  }

  return NextResponse.json({
    lens,
    categories: categories.map((item) => ({
      slug: item.slug,
      name: item.name,
      entries: getLeaderboard(item.slug, lens),
    })),
    persisted: false,
  });
}
