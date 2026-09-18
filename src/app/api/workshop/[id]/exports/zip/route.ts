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
  normalizeScriptContent,
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

function parseAssetIds(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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
        { error: "Downloads disabled for this workshop" },
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
  const filename = `${baseName}${extension}`;

  await mkdir(path.join(stageDir, ...pathSegments), { recursive: true });
  await writeFile(path.join(stageDir, ...pathSegments, filename), buffer);
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

async function buildWorkshopZip(projectId: string, request: NextRequest) {
  const access = await resolveAccess(projectId, request);
  if (access.error || !access.project) return access.error;

  const selectedAssetIds = parseAssetIds(request.nextUrl.searchParams.get("assetIds"));
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

  const normalizedAssets = (assets ?? []).map((asset) => normalizeWorkshopAsset(asset));
  const includedAssets =
    selectedAssetIds.length > 0
      ? normalizedAssets.filter((asset) => selectedAssetIds.includes(asset.id))
      : normalizedAssets;

  const scriptBlock = (blocks ?? []).find((block) => block.block_type === "script");
  const script = normalizeScriptContent(
    (scriptBlock?.content as Record<string, unknown>) ?? {}
  );
  const scenes = (blocks ?? [])
    .filter((block) => block.block_type === "scene")
    .map((block, index) => ({
      id: block.id,
      ...normalizeSceneContent(block.content as Record<string, unknown>),
      scene_order:
        typeof (block.content as { scene_order?: number }).scene_order === "number"
          ? ((block.content as { scene_order?: number }).scene_order as number)
          : index,
    }))
    .sort((a, b) => a.scene_order - b.scene_order);
  const characters = (blocks ?? [])
    .filter((block) => block.block_type === "character")
    .map((block) => ({
      id: block.id,
      ...normalizeCharacterContent(block.content as Record<string, unknown>),
    }));

  const stageDir = await mkdtemp(path.join(tmpdir(), "workshop-export-"));
  const zipPath = `${stageDir}.zip`;
  const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));
  const characterIds = new Set(characters.map((character) => character.id));

  try {
    await Promise.all([
      mkdir(path.join(stageDir, "script"), { recursive: true }),
      mkdir(path.join(stageDir, "scenes"), { recursive: true }),
      mkdir(path.join(stageDir, "characters"), { recursive: true }),
      mkdir(path.join(stageDir, "unassigned-assets"), { recursive: true }),
    ]);

    await Promise.all([
      writeFile(path.join(stageDir, "script", "screenplay.txt"), script.screenplay_text || ""),
      writeFile(
        path.join(stageDir, "script", "concept.md"),
        [
          `# ${access.project.title || "Workshop"}`,
          "",
          script.logline ? `## Logline\n${script.logline}` : null,
          script.synopsis ? `## Synopsis\n${script.synopsis}` : null,
          script.concept_notes ? `## Concept Notes\n${script.concept_notes}` : null,
          script.world_notes ? `## World Notes\n${script.world_notes}` : null,
        ]
          .filter(Boolean)
          .join("\n\n")
      ),
      writeFile(path.join(stageDir, "script", "story.json"), JSON.stringify(script, null, 2)),
      writeFile(
        path.join(stageDir, "scenes", "scenes.json"),
        JSON.stringify(scenes, null, 2)
      ),
      writeFile(
        path.join(stageDir, "scenes", "scene-outline.md"),
        scenes.length > 0
          ? scenes
              .map((scene, index) =>
                [
                  `## Scene ${index + 1}: ${scene.title || "Untitled Scene"}`,
                  `Status: ${scene.status}`,
                  scene.description ? `Summary: ${scene.description}` : null,
                  scene.script_excerpt ? `Excerpt:\n${scene.script_excerpt}` : null,
                ]
                  .filter(Boolean)
                  .join("\n\n")
              )
              .join("\n\n")
          : "No scenes yet."
      ),
    ]);

    for (const character of characters) {
      const characterSlug = sanitizeSegment(character.name || character.id);
      const characterDir = path.join(stageDir, "characters", characterSlug);
      const linkedAssets = includedAssets.filter((asset) =>
        asset.linked_character_ids.includes(character.id)
      );
      const groupedAssets = splitCharacterAssets(character, linkedAssets);
      const linkedSceneTitles = character.linked_scene_ids
        .map((sceneId) => sceneMap.get(sceneId)?.title || null)
        .filter((title): title is string => Boolean(title));

      await Promise.all([
        mkdir(path.join(characterDir, "images"), { recursive: true }),
        mkdir(path.join(characterDir, "videos"), { recursive: true }),
        writeFile(
          path.join(characterDir, "character.md"),
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
          path.join(characterDir, "character.json"),
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
      ]);

      for (const asset of groupedAssets.images) {
        await writeAssetFile(stageDir, ["characters", characterSlug, "images"], asset);
      }
      for (const asset of groupedAssets.videos) {
        await writeAssetFile(stageDir, ["characters", characterSlug, "videos"], asset);
      }
    }

    const unassignedAssets = includedAssets.filter(
      (asset) =>
        asset.linked_character_ids.filter((id) => characterIds.has(id)).length === 0
    );

    for (const asset of unassignedAssets) {
      await writeAssetFile(stageDir, ["unassigned-assets"], asset);
    }

    await writeFile(
      path.join(stageDir, "manifest.json"),
      JSON.stringify(
        {
          workshop: {
            id: access.project.id,
            title: access.project.title,
            exported_at: new Date().toISOString(),
          },
          counts: {
            characters: characters.length,
            scenes: scenes.length,
            assets: includedAssets.length,
            unassigned_assets: unassignedAssets.length,
          },
          characters: characters.map((character) => {
            const linkedAssets = includedAssets.filter((asset) =>
              asset.linked_character_ids.includes(character.id)
            );
            return {
              id: character.id,
              name: character.name,
              asset_count: linkedAssets.length,
            };
          }),
        },
        null,
        2
      )
    );

    await runZip(stageDir, zipPath);
    const zipBuffer = await readFile(zipPath);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${sanitizeSegment(
          access.project.title || "workshop"
        )}-workshop.zip"`,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-export-download", 10);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  return buildWorkshopZip(id, request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = await checkRateLimit("workshop-export-create", 10);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const rawAssetIds = body.assetIds;
  const assetIds = Array.isArray(rawAssetIds)
    ? rawAssetIds.filter((value: unknown): value is string => typeof value === "string")
    : [];

  const url = new URL(`/api/workshop/${id}/exports/zip`, request.nextUrl.origin);
  if (assetIds.length > 0) {
    url.searchParams.set("assetIds", assetIds.join(","));
  }
  const token =
    request.nextUrl.searchParams.get("token") ??
    (typeof body.token === "string" ? body.token : null);
  if (token) {
    url.searchParams.set("token", token);
  }

  return NextResponse.json({ downloadUrl: url.toString() });
}
