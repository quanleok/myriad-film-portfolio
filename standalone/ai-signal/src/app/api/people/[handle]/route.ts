import { NextResponse } from "next/server";

import { peopleByHandle, posts } from "@/lib/sample-data";

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const person = peopleByHandle[handle];

  if (!person) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    person,
    posts: posts.filter((post) => post.authorHandle === handle),
    persisted: false,
  });
}
