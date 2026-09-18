import { requireLocalSeedEnvironment, requireDevMediaEnvironment, seedEmail, newSeedPassword } from "./safety.mjs";
/**
 * Myriad Content Seeder
 *
 * Reads seed/creators/ folder structure and batch-uploads
 * creators + videos to Supabase + Bunny.net Stream.
 *
 * Usage:  npm run seed
 * Env:    Reads from .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *         BUNNY_API_KEY, BUNNY_LIBRARY_ID, BUNNY_CDN_HOSTNAME)
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

requireLocalSeedEnvironment();
const devMedia = requireDevMediaEnvironment();

// ── Env ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUNNY_API_KEY = devMedia.apiKey;
const BUNNY_LIBRARY_ID = devMedia.libraryId;
const BUNNY_CDN_HOSTNAME = devMedia.cdnHostname;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE env vars. Check .env.local");
  process.exit(1);
}
if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID || !BUNNY_CDN_HOSTNAME) {
  console.error("Missing BUNNY env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const CREATORS_DIR = path.join(__dirname, "creators");

// ── Types ────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  display_name: string;
  username: string;
  email: string;
  bio: string;
  genre_focus: string;
  subscription_price_cents?: number;
}

interface VideoMeta {
  title: string;
  description: string;
  genre: string;
  content_type: string;
  tags: string[];
  pricing_model: string;
  price_cents?: number;
}

interface Stats {
  creatorsOk: number;
  creatorsFail: number;
  videosOk: number;
  videosFail: number;
  errors: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Creator Upload ───────────────────────────────────────────────────────────

async function createCreator(
  creatorDir: string,
  stats: Stats
): Promise<string | null> {
  const profilePath = path.join(creatorDir, "profile.json");
  if (!fs.existsSync(profilePath)) {
    console.log("   ⚠️  No profile.json, skipping");
    return null;
  }

  const profile = readJson<CreatorProfile>(profilePath);
  console.log(`\n👤 Creating: ${profile.display_name} (${profile.email})`);

  // 1. Create auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: seedEmail(profile.email),
      password: newSeedPassword(),
      email_confirm: true,
    });

  if (authError) {
    // If user already exists, try to look them up
    if (authError.message.includes("already been registered")) {
      console.log("   ℹ️  Auth user already exists, looking up...");
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find((u) => u.email === profile.email);
      if (existing) {
        console.log(`   ✅ Found existing user (id: ${existing.id})`);
        return existing.id;
      }
    }
    console.error(`   ❌ Auth error: ${authError.message}`);
    stats.creatorsFail++;
    stats.errors.push(`${profile.display_name}: ${authError.message}`);
    return null;
  }

  const userId = authData.user!.id;
  console.log(`   ✅ Auth user created (id: ${userId})`);

  // 2. Upload avatar if it exists
  let avatarUrl: string | null = null;
  const avatarPath = path.join(creatorDir, "avatar.jpg");
  const avatarPngPath = path.join(creatorDir, "avatar.png");
  const actualAvatar = fs.existsSync(avatarPath)
    ? avatarPath
    : fs.existsSync(avatarPngPath)
      ? avatarPngPath
      : null;

  if (actualAvatar) {
    const avatarBuffer = fs.readFileSync(actualAvatar);
    const ext = path.extname(actualAvatar);
    const fileName = `${userId}/avatar${ext}`;
    const contentType = ext === ".png" ? "image/png" : "image/jpeg";

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarBuffer, { contentType, upsert: true });

    if (uploadErr) {
      console.log(`   ⚠️  Avatar upload failed: ${uploadErr.message}`);
    } else {
      avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
      console.log("   ✅ Avatar uploaded");
    }
  } else {
    console.log("   ⏭️  No avatar file found, skipping");
  }

  // 3. Upsert profile row
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: profile.display_name,
    username: profile.username,
    bio: profile.bio,
    is_creator: true,
    role: "creator",
    avatar_url: avatarUrl,
    subscription_price_cents: profile.subscription_price_cents ?? null,
  });

  if (profileError) {
    console.error(`   ❌ Profile error: ${profileError.message}`);
    stats.creatorsFail++;
    stats.errors.push(`${profile.display_name} profile: ${profileError.message}`);
    return null;
  }

  console.log("   ✅ Profile created");
  stats.creatorsOk++;
  return userId;
}

// ── Video Upload ─────────────────────────────────────────────────────────────

async function uploadVideo(
  videoDir: string,
  creatorId: string,
  stats: Stats
) {
  const metaPath = path.join(videoDir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    console.log("      ⚠️  No meta.json, skipping");
    return;
  }

  const meta = readJson<VideoMeta>(metaPath);
  console.log(`   🎬 Uploading: ${meta.title}`);

  // Check for video file
  const videoFile = ["video.mp4", "video.mov", "video.webm"].find((f) =>
    fs.existsSync(path.join(videoDir, f))
  );

  let bunnyVideoId: string | null = null;

  if (videoFile) {
    const videoFilePath = path.join(videoDir, videoFile);

    // Step 1: Create video entry in Bunny library
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: meta.title }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error(`      ❌ Bunny create failed: ${errText}`);
      stats.videosFail++;
      stats.errors.push(`${meta.title}: Bunny create failed`);
      return;
    }

    const videoData = await createRes.json();
    bunnyVideoId = videoData.guid;
    console.log(`      ✅ Bunny entry created (id: ${bunnyVideoId})`);

    // Step 2: Upload the actual video file
    const videoBuffer = fs.readFileSync(videoFilePath);
    const uploadRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: videoBuffer,
      }
    );

    if (!uploadRes.ok) {
      console.error("      ❌ Bunny upload failed");
      stats.videosFail++;
      stats.errors.push(`${meta.title}: Bunny upload failed`);
      return;
    }

    console.log("      ✅ Video file uploaded to Bunny");

    // Step 3: Poll until processing completes
    let status = 0;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max

    while (status !== 4 && attempts < maxAttempts) {
      await sleep(5000);
      attempts++;

      const checkRes = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
        { headers: { AccessKey: BUNNY_API_KEY } }
      );
      const checkData = await checkRes.json();
      status = checkData.status;

      if (checkData.encodeProgress !== undefined) {
        process.stdout.write(
          `\r      ⏳ Processing: ${checkData.encodeProgress}%`
        );
      }

      if (status === 5) {
        console.error("\n      ❌ Bunny processing failed");
        stats.videosFail++;
        stats.errors.push(`${meta.title}: Bunny processing failed`);
        return;
      }
    }

    if (status === 4) {
      console.log("\n      ✅ Processing complete");
    } else {
      console.log("\n      ⚠️  Processing timeout — inserting anyway");
    }
  } else {
    console.log("      ⏭️  No video file — creating DB row only (placeholder)");
  }

  // Upload thumbnail if exists
  let thumbnailUrl: string | null = null;
  const thumbFile = ["thumbnail.jpg", "thumbnail.png"].find((f) =>
    fs.existsSync(path.join(videoDir, f))
  );

  if (thumbFile) {
    const thumbPath = path.join(videoDir, thumbFile);
    const thumbBuffer = fs.readFileSync(thumbPath);
    const ext = path.extname(thumbFile);
    const contentType = ext === ".png" ? "image/png" : "image/jpeg";
    const fileName = `${creatorId}/${Date.now()}-${path.basename(videoDir)}${ext}`;

    const { error: thumbErr } = await supabase.storage
      .from("thumbnails")
      .upload(fileName, thumbBuffer, { contentType, upsert: true });

    if (thumbErr) {
      console.log(`      ⚠️  Thumbnail upload failed: ${thumbErr.message}`);
    } else {
      thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/thumbnails/${fileName}`;
      console.log("      ✅ Thumbnail uploaded");
    }
  }

  // Insert video row
  const { error: insertErr } = await supabase.from("videos").insert({
    creator_id: creatorId,
    title: meta.title,
    description: meta.description,
    genre: meta.genre,
    content_type: meta.content_type,
    tags: meta.tags,
    pricing_model: meta.pricing_model || "free",
    price_cents: meta.price_cents ?? null,
    bunny_video_id: bunnyVideoId,
    bunny_library_id: bunnyVideoId ? BUNNY_LIBRARY_ID : null,
    thumbnail_url: thumbnailUrl,
    is_processed: bunnyVideoId ? true : false,
    is_published: true,
    published_at: new Date().toISOString(),
  });

  if (insertErr) {
    console.error(`      ❌ DB insert error: ${insertErr.message}`);
    stats.videosFail++;
    stats.errors.push(`${meta.title}: ${insertErr.message}`);
    return;
  }

  console.log("      ✅ Database row inserted");
  stats.videosOk++;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log("🌱 Myriad Content Seeder");
  console.log("========================\n");

  if (!fs.existsSync(CREATORS_DIR)) {
    console.error(`Creator directory not found: ${CREATORS_DIR}`);
    process.exit(1);
  }

  const creatorFolders = fs
    .readdirSync(CREATORS_DIR)
    .filter((f) =>
      fs.statSync(path.join(CREATORS_DIR, f)).isDirectory()
    )
    .sort();

  console.log(`📁 Found ${creatorFolders.length} creator folders\n`);

  const stats: Stats = {
    creatorsOk: 0,
    creatorsFail: 0,
    videosOk: 0,
    videosFail: 0,
    errors: [],
  };

  for (const folder of creatorFolders) {
    const creatorDir = path.join(CREATORS_DIR, folder);
    const userId = await createCreator(creatorDir, stats);

    if (!userId) continue;

    // Process videos
    const videosDir = path.join(creatorDir, "videos");
    if (!fs.existsSync(videosDir)) continue;

    const videoFolders = fs
      .readdirSync(videosDir)
      .filter((f) =>
        fs.statSync(path.join(videosDir, f)).isDirectory()
      )
      .sort();

    for (const videoFolder of videoFolders) {
      await uploadVideo(path.join(videosDir, videoFolder), userId, stats);
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n========================");
  console.log("🎉 Seeding Complete!");
  console.log(
    `   Creators: ${stats.creatorsOk} created, ${stats.creatorsFail} failed`
  );
  console.log(
    `   Videos:   ${stats.videosOk} uploaded, ${stats.videosFail} failed`
  );

  if (stats.errors.length > 0) {
    console.log(`\n   Errors:`);
    for (const err of stats.errors) {
      console.log(`     - ${err}`);
    }
  }

  console.log(`   Total time: ${elapsed}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
