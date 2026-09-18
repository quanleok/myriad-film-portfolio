import { requireLocalSeedEnvironment, newSeedPassword } from "./safety.mjs";
/**
 * Populate the platform with 100 mock viewer accounts and realistic engagement:
 * - 100 viewer profiles with varied usernames/display names
 * - Views (video_views + view_count on videos)
 * - Likes (likes table + like_count on videos)
 * - Dislikes (video_dislikes + dislike_count on videos)
 * - Comments (comments table + comment_count on videos)
 * - Follows (follows table + follower_count on profiles)
 * - Watch history (watch_history table)
 *
 * Usage: npx tsx seed/populate-engagement.ts
 *
 * Safe to re-run — skips users that already exist, upserts engagement.
 */
import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

requireLocalSeedEnvironment();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// ── 100 mock users ──────────────────────────────────────────────────────────

interface MockUser {
  display_name: string;
  username: string;
}

const MOCK_USERS: MockUser[] = [
  { display_name: "Alex Rivera", username: "alexrivera" },
  { display_name: "Jordan Chen", username: "jordanchen" },
  { display_name: "Sam Takahashi", username: "samtakahashi" },
  { display_name: "Casey Morgan", username: "caseymorgan" },
  { display_name: "Taylor Kim", username: "taylorkim" },
  { display_name: "Riley Santos", username: "rileysantos" },
  { display_name: "Morgan Blake", username: "morganblake" },
  { display_name: "Jamie Park", username: "jamiepark" },
  { display_name: "Quinn Zhang", username: "quinnzhang" },
  { display_name: "Avery Nakamura", username: "averynakamura" },
  { display_name: "Drew Hernandez", username: "drewhernandez" },
  { display_name: "Skyler Wu", username: "skylerwu" },
  { display_name: "Reese Patel", username: "reesepatel" },
  { display_name: "Finley O'Brien", username: "finleyobrien" },
  { display_name: "Dakota Lee", username: "dakotalee" },
  { display_name: "Emery Tanaka", username: "emerytanaka" },
  { display_name: "Rowan Singh", username: "rowansingh" },
  { display_name: "Phoenix Nguyen", username: "phoenixnguyen" },
  { display_name: "Blair Thompson", username: "blairthomp" },
  { display_name: "Harper Liu", username: "harperliu" },
  { display_name: "Sage Williams", username: "sagewilliams" },
  { display_name: "Ellis Yamamoto", username: "ellisyama" },
  { display_name: "Marley Cruz", username: "marleycruz" },
  { display_name: "Hayden Zhao", username: "haydenzhao" },
  { display_name: "Logan Reyes", username: "loganreyes" },
  { display_name: "Blake Ito", username: "blakeito" },
  { display_name: "Charlie Okonkwo", username: "charlieokon" },
  { display_name: "Jules Martin", username: "julesmartin" },
  { display_name: "Parker Gupta", username: "parkergupta" },
  { display_name: "Kai Fernandez", username: "kaifernandez" },
  { display_name: "Lennox Sato", username: "lennoxsato" },
  { display_name: "Remy Johansson", username: "remyjohansson" },
  { display_name: "Tatum Ali", username: "tatumali" },
  { display_name: "Harley Kwan", username: "harleykwan" },
  { display_name: "Shiloh Das", username: "shilohdas" },
  { display_name: "Oakley Moreno", username: "oakleymoreno" },
  { display_name: "Arden Choi", username: "ardenchoi" },
  { display_name: "Marlowe Petrov", username: "marlowepetrov" },
  { display_name: "Indigo Watts", username: "indigowatts" },
  { display_name: "River Kozlov", username: "riverkozlov" },
  { display_name: "Wren Okafor", username: "wrenokafor" },
  { display_name: "Lennon Hayashi", username: "lennonhayashi" },
  { display_name: "Sloane Dubois", username: "sloanedubois" },
  { display_name: "Micah Torres", username: "micahtorres" },
  { display_name: "Eden Malik", username: "edenmalik" },
  { display_name: "Sutton Lam", username: "suttonlam" },
  { display_name: "Noel Fischer", username: "noelfischer" },
  { display_name: "Frankie Rao", username: "frankierao" },
  { display_name: "Bellamy Iwata", username: "bellamyiwata" },
  { display_name: "Lane Kowalski", username: "lanekowalski" },
  { display_name: "Ashton Yun", username: "ashtonyun" },
  { display_name: "Milan Bakshi", username: "milanbakshi" },
  { display_name: "Briar Hoffman", username: "briarhoffman" },
  { display_name: "Zion Okada", username: "zionokada" },
  { display_name: "Devin Larsson", username: "devinlarsson" },
  { display_name: "Robin Aziz", username: "robinaziz" },
  { display_name: "Sterling Bae", username: "sterlingbae" },
  { display_name: "Sawyer Diaz", username: "sawyerdiaz" },
  { display_name: "Campbell Naidu", username: "campbellnaidu" },
  { display_name: "Dallas Shimizu", username: "dallasshimizu" },
  { display_name: "Aubrey Kang", username: "aubreykang" },
  { display_name: "Spencer Cho", username: "spencercho" },
  { display_name: "Greer Varma", username: "greervarma" },
  { display_name: "Justice Morita", username: "justicemorita" },
  { display_name: "Navy Adebayo", username: "navyadebayo" },
  { display_name: "Perry Zheng", username: "perryzheng" },
  { display_name: "Hollis Kimura", username: "holliskimura" },
  { display_name: "True Abrams", username: "trueabrams" },
  { display_name: "Landry Fukuda", username: "landryfukuda" },
  { display_name: "Cypress Jha", username: "cypressjha" },
  { display_name: "Baylor Wen", username: "baylorwen" },
  { display_name: "Scout Nair", username: "scoutnair" },
  { display_name: "Soren Ikeda", username: "sorenikeda" },
  { display_name: "Hart Cabrera", username: "hartcabrera" },
  { display_name: "Merit Ueda", username: "meritueda" },
  { display_name: "Lake Prasad", username: "lakeprasad" },
  { display_name: "Onyx Watanabe", username: "onyxwatanabe" },
  { display_name: "Valor Mehta", username: "valormehta" },
  { display_name: "Vesper Ahn", username: "vesperahn" },
  { display_name: "Story Fujita", username: "storyfujita" },
  { display_name: "Atlas Kapoor", username: "atlaskapoor" },
  { display_name: "Haven Mori", username: "havenmori" },
  { display_name: "Cedar Basu", username: "cedarbasu" },
  { display_name: "Soleil Harada", username: "soleilharada" },
  { display_name: "Noble Iyer", username: "nobleiyer" },
  { display_name: "Winter Ogawa", username: "winterogawa" },
  { display_name: "Arrow Deshpande", username: "arrowdeshpande" },
  { display_name: "Bryn Matsuda", username: "brynmatsuda" },
  { display_name: "Cove Reddy", username: "covereddy" },
  { display_name: "Fable Ono", username: "fableono" },
  { display_name: "Reign Saxena", username: "reignsaxena" },
  { display_name: "Lyric Tachibana", username: "lyrictachibana" },
  { display_name: "Kit Nanda", username: "kitnanda" },
  { display_name: "Nico Sugiyama", username: "nicosugiyama" },
  { display_name: "Raven Bhat", username: "ravenbhat" },
  { display_name: "Ash Miyamoto", username: "ashmiyamoto" },
  { display_name: "Echo Trivedi", username: "echotrivedi" },
  { display_name: "Zephyr Aoki", username: "zephyraoki" },
  { display_name: "Lux Sharma", username: "luxsharma" },
  { display_name: "Vale Kuroda", username: "valekuroda" },
];

// ── Comments pool ───────────────────────────────────────────────────────────

const COMMENTS = [
  "This is insane quality for AI-generated video",
  "The fight choreography is actually impressive",
  "Can't believe this was made with Seedance 2.0",
  "Subscribed immediately after watching this",
  "The lighting in this is next level",
  "I've watched this like 5 times already",
  "This is what AI filmmaking should look like",
  "The attention to detail is crazy",
  "How long did this take to generate?",
  "Better than most stuff on Netflix tbh",
  "The camera work feels so cinematic",
  "My jaw literally dropped at the transformation scene",
  "AI video has come so far in just a year",
  "This needs way more views",
  "The color grading is beautiful",
  "Would love to see a full-length version of this",
  "The sound design really adds to the atmosphere",
  "Sharing this with everyone I know",
  "This creator deserves more recognition",
  "Proof that AI can be used for real art",
  "The movement is so fluid compared to other AI videos",
  "I'm blown away by the consistency between shots",
  "Every frame could be a wallpaper",
  "This is what the future of cinema looks like",
  "The emotion in the characters' faces is unreal",
  "How is this free? This is premium quality",
  "Just found this channel and I'm hooked",
  "The world-building in this is incredible",
  "Gives me chills every time I watch it",
  "AI is changing the game for independent filmmakers",
  "The action sequences are so well-composed",
  "This makes me want to try AI filmmaking myself",
  "Top tier content right here",
  "The pacing is perfect — not too fast, not too slow",
  "I need a behind-the-scenes on how you made this",
  "Absolutely stunning work",
  "This channel is criminally underrated",
  "The style is so unique compared to other AI videos",
  "Instant follow from me",
  "Can you do a tutorial on your workflow?",
  "The transitions between scenes are seamless",
  "This deserves to be on the trending page",
  "Watching AI video evolve in real time is wild",
  "The textures and materials look so realistic",
  "This is better than what most studios produce",
  "Crazy how much AI video improved this year",
  "Love the creative direction on this one",
  "The framing of each shot is masterful",
  "More people need to see this platform",
  "Perfect execution of the concept",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Seeded random for deterministic engagement distribution */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Random date within the last N days */
function randomDateWithinDays(rand: () => number, days: number): string {
  const now = Date.now();
  const offset = Math.floor(rand() * days * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

/** Pick N random items from array (no duplicates) */
function pickRandom<T>(arr: T[], n: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const rand = seededRandom(42);

  // ─── Step 1: Create 100 viewer accounts ───────────────────────────────
  console.log("=== Step 1: Creating 100 mock viewer accounts ===\n");

  const userIds: string[] = [];

  for (let i = 0; i < MOCK_USERS.length; i++) {
    const user = MOCK_USERS[i];
    const email = `${user.username}@example.test`;

    // Check if already exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", user.username)
      .maybeSingle();

    if (existing) {
      userIds.push(existing.id);
      if (i % 20 === 0) console.log(`  [${i + 1}/100] ${user.username} exists`);
      continue;
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: newSeedPassword(),
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      console.error(`  Failed: ${user.username} — ${authErr?.message}`);
      continue;
    }

    // Update profile
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        display_name: user.display_name,
        username: user.username,
      })
      .eq("id", authData.user.id);

    if (profileErr) {
      console.error(`  Profile update failed: ${user.username} — ${profileErr.message}`);
    }

    userIds.push(authData.user.id);
    if (i % 20 === 0) console.log(`  [${i + 1}/100] Created ${user.display_name}`);
  }

  console.log(`\n  Total viewer accounts ready: ${userIds.length}\n`);

  // ─── Step 2: Fetch all published videos and their creators ────────────
  console.log("=== Step 2: Fetching all published videos ===\n");

  const { data: allVideos, error: videoErr } = await supabase
    .from("videos")
    .select("id, creator_id, title, duration_seconds")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (videoErr || !allVideos) {
    console.error("Failed to fetch videos:", videoErr?.message);
    return;
  }

  console.log(`  Found ${allVideos.length} published videos\n`);

  // Get unique creator IDs
  const creatorIds = [...new Set(allVideos.map((v) => v.creator_id))];
  console.log(`  Found ${creatorIds.length} creators\n`);

  // ─── Step 3: Generate views ───────────────────────────────────────────
  console.log("=== Step 3: Adding views ===\n");

  const viewRows: {
    video_id: string;
    viewer_id: string;
    watch_duration_seconds: number;
    completed: boolean;
    created_at: string;
  }[] = [];

  const watchHistoryRows: {
    user_id: string;
    video_id: string;
    progress_seconds: number;
    duration_seconds: number;
    last_position_seconds: number;
    completed: boolean;
    created_at: string;
  }[] = [];

  for (const video of allVideos) {
    // Each video gets 30–90 views from random users
    const numViews = 30 + Math.floor(rand() * 61);
    const viewers = pickRandom(userIds, numViews, rand);
    const duration = video.duration_seconds || 120;

    for (const viewerId of viewers) {
      const watchPct = 0.3 + rand() * 0.7; // 30–100% watched
      const watchDuration = Math.floor(duration * watchPct);
      const completed = watchPct > 0.9;
      const createdAt = randomDateWithinDays(rand, 30);

      viewRows.push({
        video_id: video.id,
        viewer_id: viewerId,
        watch_duration_seconds: watchDuration,
        completed,
        created_at: createdAt,
      });

      // Also add watch history for ~60% of views
      if (rand() < 0.6) {
        watchHistoryRows.push({
          user_id: viewerId,
          video_id: video.id,
          progress_seconds: watchDuration,
          duration_seconds: duration,
          last_position_seconds: completed ? 0 : watchDuration,
          completed,
          created_at: createdAt,
        });
      }
    }
  }

  // Insert views in batches
  console.log(`  Inserting ${viewRows.length} views...`);
  for (let i = 0; i < viewRows.length; i += 500) {
    const batch = viewRows.slice(i, i + 500);
    const { error } = await supabase.from("video_views").insert(batch);
    if (error) console.error(`  Views batch ${i}: ${error.message}`);
    if (i % 2000 === 0) console.log(`    ${i}/${viewRows.length}`);
  }

  // Insert watch history in batches (upsert to avoid duplicates)
  console.log(`  Inserting ${watchHistoryRows.length} watch history entries...`);
  for (let i = 0; i < watchHistoryRows.length; i += 500) {
    const batch = watchHistoryRows.slice(i, i + 500);
    const { error } = await supabase
      .from("watch_history")
      .upsert(batch, { onConflict: "user_id,video_id" });
    if (error) console.error(`  Watch history batch ${i}: ${error.message}`);
    if (i % 2000 === 0) console.log(`    ${i}/${watchHistoryRows.length}`);
  }

  // ─── Step 4: Generate likes ───────────────────────────────────────────
  console.log("\n=== Step 4: Adding likes ===\n");

  const likeRows: { user_id: string; video_id: string; created_at: string }[] = [];

  for (const video of allVideos) {
    // 20–60 likes per video
    const numLikes = 20 + Math.floor(rand() * 41);
    const likers = pickRandom(userIds, numLikes, rand);

    for (const userId of likers) {
      likeRows.push({
        user_id: userId,
        video_id: video.id,
        created_at: randomDateWithinDays(rand, 30),
      });
    }
  }

  console.log(`  Inserting ${likeRows.length} likes...`);
  for (let i = 0; i < likeRows.length; i += 500) {
    const batch = likeRows.slice(i, i + 500);
    const { error } = await supabase
      .from("likes")
      .upsert(batch, { onConflict: "user_id,video_id" });
    if (error) console.error(`  Likes batch ${i}: ${error.message}`);
  }

  // ─── Step 5: Generate dislikes (sparse) ───────────────────────────────
  console.log("\n=== Step 5: Adding dislikes (sparse) ===\n");

  const dislikeRows: { user_id: string; video_id: string; created_at: string }[] = [];

  for (const video of allVideos) {
    // 0–5 dislikes per video (realistic ratio)
    const numDislikes = Math.floor(rand() * 6);
    const dislikers = pickRandom(userIds, numDislikes, rand);

    for (const userId of dislikers) {
      dislikeRows.push({
        user_id: userId,
        video_id: video.id,
        created_at: randomDateWithinDays(rand, 30),
      });
    }
  }

  console.log(`  Inserting ${dislikeRows.length} dislikes...`);
  for (let i = 0; i < dislikeRows.length; i += 500) {
    const batch = dislikeRows.slice(i, i + 500);
    const { error } = await supabase
      .from("video_dislikes")
      .upsert(batch, { onConflict: "user_id,video_id" });
    if (error) console.error(`  Dislikes batch ${i}: ${error.message}`);
  }

  // ─── Step 6: Generate comments ────────────────────────────────────────
  console.log("\n=== Step 6: Adding comments ===\n");

  const commentRows: {
    user_id: string;
    video_id: string;
    body: string;
    created_at: string;
  }[] = [];

  for (const video of allVideos) {
    // 5–20 comments per video
    const numComments = 5 + Math.floor(rand() * 16);
    const commenters = pickRandom(userIds, numComments, rand);

    for (const userId of commenters) {
      const comment = COMMENTS[Math.floor(rand() * COMMENTS.length)];
      commentRows.push({
        user_id: userId,
        video_id: video.id,
        body: comment,
        created_at: randomDateWithinDays(rand, 30),
      });
    }
  }

  console.log(`  Inserting ${commentRows.length} comments...`);
  for (let i = 0; i < commentRows.length; i += 500) {
    const batch = commentRows.slice(i, i + 500);
    const { error } = await supabase.from("comments").insert(batch);
    if (error) console.error(`  Comments batch ${i}: ${error.message}`);
  }

  // ─── Step 7: Generate follows ─────────────────────────────────────────
  console.log("\n=== Step 7: Adding follows ===\n");

  const followRows: { follower_id: string; creator_id: string; created_at: string }[] = [];

  for (const creatorId of creatorIds) {
    // 30–80 followers per creator
    const numFollows = 30 + Math.floor(rand() * 51);
    const followers = pickRandom(userIds, numFollows, rand);

    for (const followerId of followers) {
      followRows.push({
        follower_id: followerId,
        creator_id: creatorId,
        created_at: randomDateWithinDays(rand, 30),
      });
    }
  }

  console.log(`  Inserting ${followRows.length} follows...`);
  for (let i = 0; i < followRows.length; i += 500) {
    const batch = followRows.slice(i, i + 500);
    const { error } = await supabase
      .from("follows")
      .upsert(batch, { onConflict: "follower_id,creator_id" });
    if (error) console.error(`  Follows batch ${i}: ${error.message}`);
  }

  // ─── Step 8: Update denormalized counts on videos ─────────────────────
  console.log("\n=== Step 8: Updating video counts ===\n");

  for (const video of allVideos) {
    // Count actual rows for this video
    const [
      { count: viewCount },
      { count: likeCount },
      { count: dislikeCount },
      { count: commentCount },
    ] = await Promise.all([
      supabase.from("video_views").select("id", { count: "exact", head: true }).eq("video_id", video.id),
      supabase.from("likes").select("user_id", { count: "exact", head: true }).eq("video_id", video.id),
      supabase.from("video_dislikes").select("user_id", { count: "exact", head: true }).eq("video_id", video.id),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("video_id", video.id),
    ]);

    const { error } = await supabase
      .from("videos")
      .update({
        view_count: viewCount ?? 0,
        like_count: likeCount ?? 0,
        dislike_count: dislikeCount ?? 0,
        comment_count: commentCount ?? 0,
      })
      .eq("id", video.id);

    if (error) console.error(`  Update counts for ${video.title}: ${error.message}`);
  }

  console.log(`  Updated counts for ${allVideos.length} videos`);

  // ─── Step 9: Update follower counts on creator profiles ───────────────
  console.log("\n=== Step 9: Updating creator follower counts ===\n");

  for (const creatorId of creatorIds) {
    const { count } = await supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("creator_id", creatorId);

    // Also sum total views across all their videos
    const { data: creatorVideos } = await supabase
      .from("videos")
      .select("view_count")
      .eq("creator_id", creatorId);

    const totalViews = (creatorVideos ?? []).reduce((sum, v) => sum + (v.view_count ?? 0), 0);

    const { error } = await supabase
      .from("profiles")
      .update({
        follower_count: count ?? 0,
        total_views: totalViews,
      })
      .eq("id", creatorId);

    if (error) console.error(`  Follower count update for ${creatorId}: ${error.message}`);
  }

  console.log(`  Updated follower counts for ${creatorIds.length} creators`);

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log("\n=== Summary ===\n");
  console.log(`  Viewer accounts: ${userIds.length}`);
  console.log(`  Videos: ${allVideos.length}`);
  console.log(`  Views: ${viewRows.length}`);
  console.log(`  Watch history: ${watchHistoryRows.length}`);
  console.log(`  Likes: ${likeRows.length}`);
  console.log(`  Dislikes: ${dislikeRows.length}`);
  console.log(`  Comments: ${commentRows.length}`);
  console.log(`  Follows: ${followRows.length}`);
  console.log("\nDone!");
}

main().catch(console.error);
