import { NextResponse } from "next/server";

import { leaderboardEntries, posts, releases, toolsBySlug } from "@/lib/sample-data";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolsBySlug[slug];

  if (!tool) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    tool,
    leaderboardEntries: leaderboardEntries.filter((entry) => entry.toolSlug === slug),
    releases: releases.filter((release) => release.toolSlug === slug),
    posts: posts.filter((post) => post.linkedToolSlugs.includes(slug)),
    persisted: false,
  });
}
