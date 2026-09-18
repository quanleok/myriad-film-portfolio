import { NextResponse } from "next/server";

import { categoriesBySlug, people, posts, tools } from "@/lib/sample-data";
import { getLeaderboard } from "@/lib/ranking/score";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoriesBySlug[slug];

  if (!category) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    category,
    leaderboard: getLeaderboard(category.slug),
    posts: posts.filter((post) => post.category === category.slug),
    people: people.filter((person) => person.expertise.includes(category.slug)),
    tools: tools.filter((tool) => tool.category === category.slug),
    persisted: false,
  });
}
