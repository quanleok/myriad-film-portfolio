import { requireLocalSeedEnvironment } from "./safety.mjs";
/**
 * Set Profile Avatars for ALL Accounts
 *
 * Generates unique avatars using DiceBear API (https://api.dicebear.com)
 * and uploads them to Supabase Storage, then updates each profile's avatar_url.
 *
 * Uses a username-based hash to deterministically assign a unique style +
 * background color combo to every account — no two nearby accounts look alike.
 *
 * Usage:  npx tsx seed/set-avatars.ts
 * Flags:  --force    Re-generate ALL avatars (even if already set)
 *         --creators Only process seed creator accounts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

requireLocalSeedEnvironment();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FORCE = process.argv.includes("--force");
const CREATORS_ONLY = process.argv.includes("--creators");

// ── 15 DiceBear styles for maximum variety ────────────────────────────────────

const ALL_STYLES = [
  "adventurer",
  "avataaars",
  "big-ears",
  "big-smile",
  "bottts",
  "croodles",
  "dylan",
  "fun-emoji",
  "glass",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "open-peeps",
  "pixel-art",
  "personas",
  "thumbs",
  "rings",
  "shapes",
] as const;

type AvatarStyle = (typeof ALL_STYLES)[number];

// ── 30 distinct background colors — bright, muted, warm, cool ─────────────────

const ALL_BG_COLORS = [
  // Deep/dark
  "0d1117", "1a1a2e", "0b132b", "1b1b2f",
  // Blues
  "1d3557", "003049", "023e8a", "0077b6",
  // Purples
  "2d1b69", "4a1942", "3c1361", "6a0572",
  // Teals/greens
  "264653", "004643", "2d6a4f", "1b4332",
  // Warm reds/oranges
  "6b2737", "9b2226", "ae2012", "bb3e03",
  // Earthy
  "6b4226", "774936", "5e503f", "3a3238",
  // Slate/gray
  "2b2d42", "343a40", "495057", "1e1e2e",
  // Vibrant accents
  "7b2cbf", "c77dff",
];

// ── Curated creator assignments (hand-picked for personality) ─────────────────

interface CreatorAssignment {
  username: string;
  display_name: string;
  style: AvatarStyle;
  bgColor: string;
  seedExtra?: string;
}

const CREATOR_AVATARS: CreatorAssignment[] = [
  // Video creators
  { username: "aicinema", display_name: "AI Cinema", style: "glass", bgColor: "003049" },
  { username: "animestudiox", display_name: "Anime Studio X", style: "adventurer", bgColor: "6a0572" },
  { username: "beatsbyaria", display_name: "Beats by Aria", style: "micah", bgColor: "023e8a" },
  { username: "mememachine", display_name: "Meme Machine", style: "fun-emoji", bgColor: "bb3e03" },
  { username: "novafilms", display_name: "Nova Films", style: "open-peeps", bgColor: "1d3557" },
  { username: "pixelshorts", display_name: "Pixel Shorts", style: "pixel-art", bgColor: "2d6a4f" },
  { username: "seedance", display_name: "Seedance Showcase", style: "bottts", bgColor: "0b132b" },

  // Music seed artists
  { username: "lunawaves", display_name: "Luna Waves", style: "lorelei", bgColor: "2d1b69", seedExtra: "lunar" },
  { username: "marcuscole", display_name: "Marcus Cole", style: "avataaars", bgColor: "6b2737" },
  { username: "sakurakeys", display_name: "Sakura Keys", style: "big-smile", bgColor: "c77dff", seedExtra: "cherry" },
  { username: "deserthighway", display_name: "Desert Highway", style: "thumbs", bgColor: "774936" },
  { username: "voltmusic", display_name: "VOLT", style: "shapes", bgColor: "7b2cbf" },
  { username: "sofiareyes", display_name: "Sofia Reyes", style: "notionists", bgColor: "9b2226", seedExtra: "sofia" },
  { username: "jazzcollective", display_name: "Jazz Collective", style: "croodles", bgColor: "1b4332" },

  // Course seed creators
  { username: "codeacademy", display_name: "Code Academy", style: "bottts", bgColor: "0d1117", seedExtra: "code" },
  { username: "designlab", display_name: "Design Lab", style: "rings", bgColor: "3c1361", seedExtra: "design" },
  { username: "photopro", display_name: "Photo Pro", style: "dylan", bgColor: "5e503f", seedExtra: "photo" },
];

// ── Hash-based style + color picker for viewer accounts ───────────────────────

function hashUsername(username: string): number {
  const hash = crypto.createHash("md5").update(username).digest();
  return hash.readUInt32BE(0);
}

function pickStyle(username: string): AvatarStyle {
  const h = hashUsername(username + "_style");
  return ALL_STYLES[h % ALL_STYLES.length];
}

function pickBgColor(username: string): string {
  const h = hashUsername(username + "_bg");
  return ALL_BG_COLORS[h % ALL_BG_COLORS.length];
}

// ── Avatar generation & upload ────────────────────────────────────────────────

async function generateAvatar(
  username: string,
  style: AvatarStyle,
  bgColor: string,
  seedExtra?: string,
): Promise<Buffer> {
  const seed = encodeURIComponent(username + (seedExtra || ""));
  const url = `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&backgroundColor=${bgColor}&size=256`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DiceBear ${res.status}: ${style} for ${username}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function uploadAvatar(username: string, pngBuffer: Buffer): Promise<string> {
  const fileName = `${username}-avatar.png`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, pngBuffer, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Upload error for ${username}: ${error.message}`);
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
}

async function updateProfile(username: string, avatarUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("username", username);

  if (error) {
    console.error(`  DB error for ${username}: ${error.message}`);
    return false;
  }
  return true;
}

async function processOne(
  displayName: string,
  username: string,
  style: AvatarStyle,
  bgColor: string,
  seedExtra?: string,
): Promise<boolean> {
  try {
    const png = await generateAvatar(username, style, bgColor, seedExtra);
    const url = await uploadAvatar(username, png);
    const ok = await updateProfile(username, url);
    if (ok) console.log(`  ✓ ${displayName.padEnd(22)} ${style.padEnd(14)} #${bgColor}`);
    return ok;
  } catch (err: any) {
    console.error(`  ✗ ${displayName}: ${err.message}`);
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Myriad Avatar Generator v2 — max variety");
  console.log("═══════════════════════════════════════════════\n");

  let totalOk = 0;
  let totalFail = 0;

  // ── Step 1: Seed creators (curated styles) ──
  console.log("── Seed Creators (curated) ──\n");
  for (const c of CREATOR_AVATARS) {
    const ok = await processOne(c.display_name, c.username, c.style, c.bgColor, c.seedExtra);
    ok ? totalOk++ : totalFail++;
    await sleep(250);
  }

  if (CREATORS_ONLY) {
    printSummary(totalOk, totalFail);
    return;
  }

  // ── Step 2: All other profiles ──
  // Fetch ALL profiles (or only those without avatars unless --force)
  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .order("created_at", { ascending: true });

  if (!FORCE) {
    query = query.is("avatar_url", null);
  }

  const { data: profiles, error } = await query;
  if (error) {
    console.error("Failed to fetch profiles:", error.message);
    return;
  }

  const creatorUsernames = new Set(CREATOR_AVATARS.map((c) => c.username));
  const remaining = (profiles ?? []).filter((p) => !creatorUsernames.has(p.username));

  if (remaining.length === 0) {
    console.log("\n  No additional profiles to process.");
    printSummary(totalOk, totalFail);
    return;
  }

  console.log(`\n── Other Profiles (${remaining.length} accounts, hash-based styles) ──\n`);

  for (const p of remaining) {
    const style = pickStyle(p.username);
    const bg = pickBgColor(p.username);
    const ok = await processOne(p.display_name, p.username, style, bg);
    ok ? totalOk++ : totalFail++;
    await sleep(250);
  }

  printSummary(totalOk, totalFail);
}

function printSummary(ok: number, fail: number) {
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  Done: ${ok} updated, ${fail} failed`);
  console.log("═══════════════════════════════════════════════\n");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch(console.error);
