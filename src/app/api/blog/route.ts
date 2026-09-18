import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

// GET /api/blog?page=N — public, returns published posts
export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
    const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

    const supabase = await createClient();
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id, title, body, cover_image_url, tags, is_pinned, published_at")
      .eq("is_published", true)
      .eq("is_pinned", false)
      .order("published_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE);

    if (error) {
      console.error("[api] blog list error:", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json({
      posts: posts ?? [],
      hasMore: (posts?.length ?? 0) > PAGE_SIZE,
    });
  } catch (err) {
    console.error("[api] blog error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
