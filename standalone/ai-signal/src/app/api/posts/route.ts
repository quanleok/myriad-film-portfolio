import { NextRequest, NextResponse } from "next/server";

import { posts } from "@/lib/sample-data";

export function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  return NextResponse.json({
    posts: category ? posts.filter((post) => post.category === category) : posts,
    persisted: false,
  });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();

  return NextResponse.json(
    {
      accepted: true,
      persisted: false,
      received: payload,
      note: "Post creation is scaffolded here for product contract work only.",
    },
    { status: 202 },
  );
}
