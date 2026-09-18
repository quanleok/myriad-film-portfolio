import { requireLocalSeedEnvironment, requireDevMediaEnvironment, seedEmail } from "./safety.mjs";
/**
 * Myriad Seed Cleanup
 *
 * Removes all seed creator accounts, their videos from Bunny.net,
 * and all associated database rows. Identifies seed accounts by
 * the @example.test email domain.
 *
 * Usage:  npm run seed:clean
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

requireLocalSeedEnvironment();
const devMedia = requireDevMediaEnvironment();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUNNY_API_KEY = devMedia.apiKey;
const BUNNY_LIBRARY_ID = devMedia.libraryId;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const CREATORS_DIR = path.join(__dirname, "creators");

interface CreatorProfile {
  email: string;
  display_name: string;
}

async function main() {
  console.log("🧹 Myriad Seed Cleanup");
  console.log("======================\n");

  // Collect seed emails from profile.json files
  const seedEmails: string[] = [];

  if (fs.existsSync(CREATORS_DIR)) {
    const folders = fs
      .readdirSync(CREATORS_DIR)
      .filter((f) => fs.statSync(path.join(CREATORS_DIR, f)).isDirectory());

    for (const folder of folders) {
      const profilePath = path.join(CREATORS_DIR, folder, "profile.json");
      if (fs.existsSync(profilePath)) {
        const profile: CreatorProfile = JSON.parse(
          fs.readFileSync(profilePath, "utf-8")
        );
        seedEmails.push(seedEmail(profile.email));
      }
    }
  }

  console.log(`📧 Found ${seedEmails.length} seed emails to clean up\n`);

  if (seedEmails.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  // Get auth users matching seed emails
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const seedUsers = (usersData?.users ?? []).filter(
    (u) => u.email && seedEmails.includes(u.email)
  );

  console.log(`👤 Found ${seedUsers.length} auth users to remove\n`);

  for (const user of seedUsers) {
    console.log(`🗑️  Cleaning: ${user.email} (${user.id})`);

    // 1. Delete videos from Bunny + DB
    const { data: videos } = await supabase
      .from("videos")
      .select("id, title, bunny_video_id")
      .eq("creator_id", user.id);

    for (const video of videos ?? []) {
      // Delete from Bunny if it has a bunny_video_id
      if (video.bunny_video_id && BUNNY_API_KEY && BUNNY_LIBRARY_ID) {
        try {
          await fetch(
            `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${video.bunny_video_id}`,
            {
              method: "DELETE",
              headers: { AccessKey: BUNNY_API_KEY },
            }
          );
          console.log(`   ✅ Deleted Bunny video: ${video.title}`);
        } catch {
          console.log(`   ⚠️  Failed to delete Bunny video: ${video.title}`);
        }
      }
    }

    // 2. Delete all related DB rows (cascade should handle most)
    const tables = [
      "video_reactions",
      "comments",
      "likes",
      "video_dislikes",
      "watchlist",
      "watch_history",
      "playlist_items",
      "playlists",
      "videos",
      "follows",
      "subscriptions",
    ];

    for (const table of tables) {
      const col = table === "follows" ? "following_id" : "creator_id";
      const userCol =
        table === "videos" || table === "follows"
          ? col
          : "user_id";

      // Try creator_id first, then user_id
      await supabase.from(table).delete().eq("creator_id", user.id).then(() => {});
      await supabase.from(table).delete().eq("user_id", user.id).then(() => {});
    }

    // 3. Delete profile
    await supabase.from("profiles").delete().eq("id", user.id);
    console.log("   ✅ Profile deleted");

    // 4. Delete auth user
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.log(`   ⚠️  Auth delete failed: ${error.message}`);
    } else {
      console.log("   ✅ Auth user deleted");
    }
  }

  console.log("\n======================");
  console.log("🧹 Cleanup complete!");
  console.log(`   Removed ${seedUsers.length} seed accounts and their data.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
