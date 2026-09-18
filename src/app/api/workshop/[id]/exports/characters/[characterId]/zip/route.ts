import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getWorkshopAssetPlaybackUrl,
  normalizeCharacterContent,
  normalizeSceneContent,
  normalizeWorkshopAsset,
  splitCharacterAssets,
} from "@/lib/workshop";

function sanitizeSegment(input: string) {
  return input
    .replace(/[^a-z0-9-_\.]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "item";
}

function inferExtension(url: string | null, fallback: string) {
  if (!url) return fallback;
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

function runZip(stageDir: string, zipPath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("zip", ["-rq", zipPath, "."], { cwd: stageDir });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `zip exited with ${code}`));
      }
    });
    child.on("error", reject);
  });
}

async function resolveAccess(projectId: string, request: NextRequest) {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("workshop_projects")
    .select("id, owner_id, visibility, share_token, title, allow_share_downloads")
    .eq("id", projectId)
    .single();

  if (!project) {
    return {
      error: NextResponse.json({ error: "Project not found" }, { status: 404 }),
      project: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shareToken = request.nextUrl.searchParams.get("token");
  const isOwner = user?.id === project.owner_id;
  let userRole: "owner" | "editor" | "viewer" | null = isOwner ? "owner" : null;

  if (user && !isOwner) {
    const { data: collab } = await admin
      .from("workshop_collaborators")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (collab) {
      userRole = collab.role as "editor" | "viewer";
    }
  }

  const canRead =
    project.visibility === "public" ||
    userRole !== null ||
    (shareToken && shareToken === project.share_token);

  if (!canRead) {
    return {
      error: NextResponse.json({ error: "Access denied" }, { status: 403 }),
      project: null,
    };
  }

  if (!isOwner && !project.allow_share_downloads) {
    return {
      error: NextResponse.json(
        { error: "Downloads disabled for this workspace" },
        { status: 403 }
      ),
      project: null,
    };
  }

  return { error: null, project };
}

async function writeAssetFile(
  stageDir: string,
  pathSegments: string[],
  asset: ReturnType<typeof normalizeWorkshopAsset>
) {
  const assetUrl = getWorkshopAssetPlaybackUrl(asset) || asset.url;
  if (!assetUrl) return;

  const response = await fetch(assetUrl);
  if (!response.ok) return;

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = inferExtension(
    assetUrl,
    asset.media_type === "video" ? ".mp4" : ".jpg"
  );
  const baseName = sanitizeSegment(asset.title || asset.id);

  await mkdir(path.join(stageDir, ...pathSegments), { recursive: true });
  await writeFile(
    path.join(stageDir, ...pathSegments, `${baseName}${extension}`),
    buffer
  );
}

function buildCharacterMarkdown({
  name,
  role,
  description,
  lookNotes,
  imageCount,
  videoCount,
  sceneTitles,
}: {
  name: string;
  role: string;
  description: string;
  lookNotes: string;
  imageCount: number;
  videoCount: number;
  sceneTitles: string[];
}) {
  const lines = [
    `# ${name || "Unnamed Character"}`,
    "",
    `Role: ${role}`,
    `Images: ${imageCount}`,
    `Videos: ${videoCount}`,
    "",
  ];

  if (description) {
    lines.push("## Description", description, "");
  }

  if (lookNotes) {
    lines.push("## Look Notes", lookNotes, "");
  }

  if (sceneTitles.length > 0) {
    lines.push("## Linked Scenes", ...sceneTitles.map((title) => `- ${title}`), "");
  }

  return lines.join("\n");
}

async function buildCharacterZip(
  projectId: string,
  characterId: string,
  request: NextRequest
) {
  const access = await resolveAccess(projectId, request);
  if (access.error || !access.project) return access.error;

  const admin = createAdminClient();
  const [{ data: blocks }, { data: assets }] = await Promise.all([
    admin
      .from("workshop_blocks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    admin
      .from("workshop_assets")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const characterBlock = (blocks ?? []).find(
    (block) => block.block_type === "character" && block.id === characterId
  );
  if (!characterBlock) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const scenes = (blocks ?? [])
    .filter((block) => block.block_type === "scene")
    .map((block) => ({
      id: block.id,
      ...normalizeSceneContent(block.content as Record<string, unknown>),
    }));
  const character = {
    id: characterBlock.id,
    ...normalizeCharacterContent(characterBlock.content as Record<string, unknown>),
  };
  const linkedAssets = (assets ?? [])
    .map((asset) => normalizeWorkshopAsset(asset))
    .filter((asset) => asset.linked_character_ids.includes(character.id));
  const groupedAssets = splitCharacterAssets(character, linkedAssets);
  const linkedSceneTitles = character.linked_scene_ids
    .map((sceneId) => scenes.find((scene) => scene.id === sceneId)?.title || null)
    .filter((title): title is string => Boolean(title));

  const stageDir = await mkdtemp(path.join(tmpdir(), "workshop-character-export-"));
  const zipPath = `${stageDir}.zip`;

  try {
    await Promise.all([
      mkdir(path.join(stageDir, "images"), { recursive: true }),
      mkdir(path.join(stageDir, "videos"), { recursive: true }),
      writeFile(
        path.join(stageDir, "character.md"),
        buildCharacterMarkdown({
          name: character.name,
          role: character.role,
          description: character.description,
          lookNotes: character.look_notes,
          imageCount: groupedAssets.images.length,
          videoCount: groupedAssets.videos.length,
          sceneTitles: linkedSceneTitles,
        })
      ),
      writeFile(
        path.join(stageDir, "character.json"),
        JSON.stringify(
          {
            ...character,
            scenes: linkedSceneTitles,
            assets: linkedAssets,
          },
          null,
          2
        )
      ),
      writeFile(
        path.join(stageDir, "manifest.json"),
        JSON.stringify(
          {
            workshop: {
              id: access.project.id,
              title: access.project.title,
            },
            character: {
              id: character.id,
              name: character.name,
              exported_at: new Date().toISOString(),
            },
            counts: {
              images: groupedAssets.images.length,
              videos: groupedAssets.videos.length,
              scenes: linkedSceneTitles.length,
            },
          },
          null,
          2
        )
      ),
    ]);

    for (const asset of groupedAssets.images) {
      await writeAssetFile(stageDir, ["images"], asset);
    }
    for (const asset of groupedAssets.videos) {
      await writeAssetFile(stageDir, ["videos"], asset);
    }

    await runZip(stageDir, zipPath);
    const zipBuffer = await readFile(zipPath);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${sanitizeSegment(
          character.name || "character"
        )}-character-pack.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await rm(stageDir, { recursive: true, force: true }).catch(() => undefined);
    await rm(zipPath, { force: true }).catch(() => undefined);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-character-export-download", 10);
  if (rateLimited) return rateLimited;

  const { id, characterId } = await params;
  return buildCharacterZip(id, characterId, request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-character-export-create", 10);
  if (rateLimited) return rateLimited;

  const { id, characterId } = await params;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const url = new URL(
    `/api/workshop/${id}/exports/characters/${characterId}/zip`,
    request.nextUrl.origin
  );
  const token =
    request.nextUrl.searchParams.get("token") ??
    (typeof body.token === "string" ? body.token : null);
  if (token) {
    url.searchParams.set("token", token);
  }

  return NextResponse.json({ downloadUrl: url.toString() });
}
