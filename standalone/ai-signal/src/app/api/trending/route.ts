import { NextResponse } from "next/server";

import { getTrendingFeed } from "@/lib/trending/score";

export function GET() {
  return NextResponse.json({
    trends: getTrendingFeed(),
    persisted: false,
  });
}
