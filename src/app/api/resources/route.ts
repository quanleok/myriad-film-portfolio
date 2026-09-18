import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import { fetchFilteredResources } from "@/lib/resources-server";
import { parseResourceCategory, parseResourceQuickFilter, parseResourceSort, type ResourceCategory, type ResourceLicense } from "@/lib/resources";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const category = parseResourceCategory(searchParams.get("category"));
  const tag = searchParams.get("tag");
  const sort = parseResourceSort(searchParams.get("sort"));
  const quickFilter = parseResourceQuickFilter(searchParams.get("filter"));

  const resources = await fetchFilteredResources({
    query,
    category,
    tag,
    sort,
    quickFilter,
  });

  return NextResponse.json({ resources });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/resources", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      category?: ResourceCategory;
      tags?: string[];
      license?: ResourceLicense;
      thumbnail_url?: string | null;
      files?: Array<{
        file_url: string;
        file_name: string;
        file_type?: string | null;
        file_size_bytes?: number | null;
      }>;
      is_published?: boolean;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    if (!body.category || parseResourceCategory(body.category) === "all") {
      return NextResponse.json({ error: "Choose a resource category." }, { status: 400 });
    }

    if (!Array.isArray(body.files) || !body.files.length) {
      return NextResponse.json({ error: "Upload at least one file." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: resource, error } = await admin
      .from("resources")
      .insert({
        user_id: user.id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        category: body.category,
        tags: (body.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
        thumbnail_url: body.thumbnail_url ?? null,
        license: body.license ?? "free",
        is_published: body.is_published ?? true,
      })
      .select("id")
      .single();

    if (error || !resource) {
      console.error("[api] resource create error:", error);
      return NextResponse.json({ error: "Could not create resource." }, { status: 500 });
    }

    const { error: filesError } = await admin.from("resource_files").insert(
      body.files.map((file, index) => ({
        resource_id: resource.id,
        file_url: file.file_url,
        file_name: file.file_name,
        file_type: file.file_type ?? null,
        file_size_bytes: file.file_size_bytes ?? null,
        sort_order: index,
      }))
    );

    if (filesError) {
      console.error("[api] resource files create error:", filesError);
      await admin.from("resources").delete().eq("id", resource.id);
      return NextResponse.json({ error: "Could not save resource files." }, { status: 500 });
    }

    return NextResponse.json({ id: resource.id }, { status: 201 });
  } catch (error) {
    console.error("[api] resources POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
