import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";

const SELECT_FIELDS = "id, title, description, cover_image_url, visibility, owner_id, created_at, updated_at";

function getSortColumn(sort: string): { column: string; ascending: boolean } {
  switch (sort) {
    case "created":
      return { column: "created_at", ascending: false };
    case "title":
      return { column: "title", ascending: true };
    case "updated":
    default:
      return { column: "updated_at", ascending: false };
  }
}

async function enrichWithCounts(
  projects: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  if (projects.length === 0) return projects;

  const admin = createAdminClient();
  const projectIds = projects.map((p) => p.id as string);

  // Fetch block counts grouped by type
  const { data: blocks } = await admin
    .from("workshop_blocks")
    .select("project_id, block_type")
    .in("project_id", projectIds);

  // Fetch collaborator counts
  const { data: collabs } = await admin
    .from("workshop_collaborators")
    .select("project_id")
    .in("project_id", projectIds);

  // Build count maps
  const sceneCounts = new Map<string, number>();
  const charCounts = new Map<string, number>();
  const collabCounts = new Map<string, number>();

  for (const b of blocks ?? []) {
    const pid = b.project_id as string;
    if (b.block_type === "scene") sceneCounts.set(pid, (sceneCounts.get(pid) ?? 0) + 1);
    if (b.block_type === "character") charCounts.set(pid, (charCounts.get(pid) ?? 0) + 1);
  }

  for (const c of collabs ?? []) {
    const pid = c.project_id as string;
    collabCounts.set(pid, (collabCounts.get(pid) ?? 0) + 1);
  }

  return projects.map((p) => ({
    ...p,
    scene_count: sceneCounts.get(p.id as string) ?? 0,
    character_count: charCounts.get(p.id as string) ?? 0,
    collaborator_count: collabCounts.get(p.id as string) ?? 0,
  }));
}

// GET /api/workshop — list projects (public + user's own/collaborated)
export async function GET(request: NextRequest) {
  const rateLimited = await checkRateLimit("workshop-list", 60);
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const filter = request.nextUrl.searchParams.get("filter") ?? "all";
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const sort = request.nextUrl.searchParams.get("sort") ?? "updated";
  const admin = createAdminClient();

  if (!user) {
    // Unauthenticated: only public projects
    let query = admin
      .from("workshop_projects")
      .select(SELECT_FIELDS)
      .eq("visibility", "public");

    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    const sortOpt = getSortColumn(sort);
    query = query.order(sortOpt.column, { ascending: sortOpt.ascending }).limit(50);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    const enriched = await enrichWithCounts((data ?? []) as Array<Record<string, unknown>>);
    return NextResponse.json({ projects: enriched });
  }

  // Get collaborator project IDs (needed for "collaborated" and "all" filters)
  let collabIds: string[] = [];
  if (filter === "collaborated" || filter === "all") {
    const { data: collabs } = await admin
      .from("workshop_collaborators")
      .select("project_id")
      .eq("user_id", user.id);
    collabIds = (collabs ?? []).map((c) => c.project_id);
  }

  let query;

  if (filter === "mine") {
    query = admin
      .from("workshop_projects")
      .select(SELECT_FIELDS)
      .eq("owner_id", user.id);
  } else if (filter === "collaborated") {
    if (collabIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }
    query = admin
      .from("workshop_projects")
      .select(SELECT_FIELDS)
      .in("id", collabIds);
  } else if (filter === "public") {
    query = admin
      .from("workshop_projects")
      .select(SELECT_FIELDS)
      .eq("visibility", "public");
  } else {
    // "all" — public + user's own + collaborated
    query = admin
      .from("workshop_projects")
      .select(SELECT_FIELDS)
      .or(`visibility.eq.public,owner_id.eq.${user.id}${collabIds.length > 0 ? `,id.in.(${collabIds.join(",")})` : ""}`);
  }

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  const sortOpt = getSortColumn(sort);
    query = query.order(sortOpt.column, { ascending: sortOpt.ascending }).limit(50);

  const { data, error } = await query;
  if (error) {
    console.error("[api] workshop list error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  const enriched = await enrichWithCounts((data ?? []) as Array<Record<string, unknown>>);
  return NextResponse.json({ projects: enriched });
}

// POST /api/workshop — create project
export async function POST(request: NextRequest) {
  const rateLimited = await checkRateLimit("workshop-create", 10);
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const banned = await checkBanned(user.id);
  if (banned) return banned;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title as string)?.trim();
  if (!title || title.length < 2 || title.length > 200) {
    return NextResponse.json({ error: "Title must be 2-200 characters" }, { status: 400 });
  }

  const description = ((body.description as string) ?? "").trim().slice(0, 1000);
  const visibility = body.visibility === "public" ? "public" : "private";

  const admin = createAdminClient();
  const { data: project, error } = await admin
    .from("workshop_projects")
    .insert({
      owner_id: user.id,
      title,
      description,
      visibility,
    })
    .select()
    .single();

  if (error) {
    console.error("[api] workshop create error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
