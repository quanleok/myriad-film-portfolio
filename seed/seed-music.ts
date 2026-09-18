import { requireLocalSeedEnvironment, newSeedPassword } from "./safety.mjs";
/**
 * Myriad Music Seeder
 *
 * Seeds mock music tracks directly into Supabase.
 * No audio files needed — creates DB rows only (placeholders).
 *
 * Usage:  npx tsx seed/seed-music.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

requireLocalSeedEnvironment();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Artist & Track Data ───────────────────────────────────────────────────────

interface ArtistDefinition {
  creator: {
    display_name: string;
    username: string;
    email: string;
    password: string;
    bio: string;
    subscription_price_cents?: number;
  };
  tracks: {
    title: string;
    description: string;
    genre: string;
    tags: string[];
    mood_tags: string[];
    pricing_model: string;
    is_premium: boolean;
    price_cents?: number;
  }[];
}

const ARTISTS: ArtistDefinition[] = [
  {
    creator: {
      display_name: "Luna Waves",
      username: "lunawaves",
      email: "lunawaves@example.test",
      password: newSeedPassword(),
      bio: "Dreamy electronic producer blending ambient textures with lo-fi beats. Based in Tokyo. New tracks every Friday.",
      subscription_price_cents: 499,
    },
    tracks: [
      {
        title: "Midnight Drift",
        description: "Late night drive through neon-lit streets. A lo-fi electronic track with warm synth pads and soft drums.",
        genre: "lo_fi",
        tags: ["chill", "nighttime", "synth"],
        mood_tags: ["chill", "dreamy", "late-night"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Rainy Window",
        description: "The sound of rain on glass, layered with gentle piano and tape hiss.",
        genre: "lo_fi",
        tags: ["rain", "piano", "ambient"],
        mood_tags: ["calm", "melancholy", "cozy"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Starfield",
        description: "An ambient journey through deep space. Shimmering pads and distant arpeggios.",
        genre: "ambient",
        tags: ["space", "ambient", "atmospheric"],
        mood_tags: ["dreamy", "ethereal", "spacey"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Cloud Nine",
        description: "Uplifting lo-fi with bright chords, vinyl crackle, and floating melodies.",
        genre: "lo_fi",
        tags: ["upbeat", "lo-fi", "happy"],
        mood_tags: ["happy", "uplifting", "sunny"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Neon Pulse",
        description: "Retro synth-wave meets lo-fi. Pulsing bass and glittering arpeggios.",
        genre: "electronic",
        tags: ["synthwave", "retro", "bass"],
        mood_tags: ["energetic", "retro", "nocturnal"],
        pricing_model: "subscription",
        is_premium: true,
      },
    ],
  },
  {
    creator: {
      display_name: "Marcus Cole",
      username: "marcuscole",
      email: "marcuscole@example.test",
      password: newSeedPassword(),
      bio: "Singer-songwriter from Atlanta. R&B, soul, and hip-hop influenced. Raw vocals over smooth production.",
      subscription_price_cents: 599,
    },
    tracks: [
      {
        title: "Golden Hour",
        description: "Smooth R&B about that magic moment when everything feels right. Silky vocals over warm keys.",
        genre: "r_and_b",
        tags: ["rnb", "soul", "vocals"],
        mood_tags: ["romantic", "warm", "golden"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "City Lights",
        description: "Late night hip-hop vibes. Storytelling over a boom-bap beat with jazz samples.",
        genre: "hip_hop",
        tags: ["hip-hop", "boom-bap", "jazz"],
        mood_tags: ["reflective", "nocturnal", "confident"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "On My Mind",
        description: "Can't stop thinking about you. An R&B slow jam with falsetto harmonies.",
        genre: "r_and_b",
        tags: ["slow-jam", "falsetto", "love"],
        mood_tags: ["romantic", "longing", "intimate"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Run It Back",
        description: "High energy hip-hop anthem. Hard-hitting drums with melodic hooks.",
        genre: "hip_hop",
        tags: ["anthem", "energy", "drums"],
        mood_tags: ["energetic", "confident", "hype"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "After Midnight",
        description: "Intimate acoustic R&B. Just guitar, voice, and reverb.",
        genre: "r_and_b",
        tags: ["acoustic", "intimate", "stripped"],
        mood_tags: ["intimate", "raw", "late-night"],
        pricing_model: "subscription",
        is_premium: true,
      },
      {
        title: "Elevate",
        description: "Motivational hip-hop with soaring synths and powerful bars about overcoming.",
        genre: "hip_hop",
        tags: ["motivation", "uplifting", "bars"],
        mood_tags: ["uplifting", "powerful", "triumphant"],
        pricing_model: "subscription",
        is_premium: true,
      },
    ],
  },
  {
    creator: {
      display_name: "Sakura Keys",
      username: "sakurakeys",
      email: "sakurakeys@example.test",
      password: newSeedPassword(),
      bio: "Classical pianist reimagining timeless pieces with modern production. Concerts, covers, and originals.",
    },
    tracks: [
      {
        title: "Moonlight Reimagined",
        description: "Beethoven's Moonlight Sonata with subtle electronic textures and reverb. Classical meets ambient.",
        genre: "classical",
        tags: ["beethoven", "piano", "reimagined"],
        mood_tags: ["contemplative", "beautiful", "haunting"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Cherry Blossom Waltz",
        description: "An original piano waltz inspired by spring in Kyoto. Light, delicate, and hopeful.",
        genre: "classical",
        tags: ["piano", "waltz", "original"],
        mood_tags: ["gentle", "hopeful", "spring"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Raindrop Prelude",
        description: "Chopin's Raindrop Prelude performed on a restored 1920s Steinway. Pure and unprocessed.",
        genre: "classical",
        tags: ["chopin", "piano", "steinway"],
        mood_tags: ["melancholy", "intimate", "reflective"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Electric Nocturne",
        description: "A Chopin nocturne layered with synthesizers and ambient drones. Classical fusion.",
        genre: "classical",
        tags: ["chopin", "fusion", "electronic"],
        mood_tags: ["dreamy", "ethereal", "nocturnal"],
        pricing_model: "free",
        is_premium: false,
      },
    ],
  },
  {
    creator: {
      display_name: "Desert Highway",
      username: "deserthighway",
      email: "deserthighway@example.test",
      password: newSeedPassword(),
      bio: "Indie rock band from Austin, TX. Dusty guitars, honest lyrics, and wide open spaces.",
    },
    tracks: [
      {
        title: "Open Road",
        description: "Windows down, radio up. A driving indie rock anthem about leaving everything behind.",
        genre: "indie",
        tags: ["indie-rock", "driving", "guitar"],
        mood_tags: ["free", "adventurous", "nostalgic"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Dust & Gold",
        description: "Twangy guitars meet indie sensibility. A story about chasing dreams in a small town.",
        genre: "indie",
        tags: ["indie", "folk", "storytelling"],
        mood_tags: ["reflective", "warm", "americana"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Campfire Song",
        description: "Acoustic folk track meant for singing along under the stars. Simple chords, big heart.",
        genre: "country",
        tags: ["folk", "acoustic", "campfire"],
        mood_tags: ["cozy", "nostalgic", "communal"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Neon Motel",
        description: "Late night alt-rock with gritty guitars and reverb-soaked vocals. A road trip gone sideways.",
        genre: "rock",
        tags: ["alt-rock", "gritty", "reverb"],
        mood_tags: ["dark", "moody", "restless"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Morning Light",
        description: "Gentle indie folk about new beginnings. Fingerpicked guitar and soft harmonies.",
        genre: "indie",
        tags: ["folk", "gentle", "morning"],
        mood_tags: ["peaceful", "hopeful", "tender"],
        pricing_model: "free",
        is_premium: false,
      },
    ],
  },
  {
    creator: {
      display_name: "VOLT",
      username: "voltmusic",
      email: "voltmusic@example.test",
      password: newSeedPassword(),
      bio: "Electronic music producer. House, techno, and everything that makes you move. Berlin-based.",
      subscription_price_cents: 699,
    },
    tracks: [
      {
        title: "Bassline Theory",
        description: "Deep house groover. Rolling bassline, crisp hats, and a hypnotic vocal chop.",
        genre: "electronic",
        tags: ["deep-house", "bass", "groove"],
        mood_tags: ["groovy", "hypnotic", "club"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Warehouse",
        description: "Raw techno built for dark rooms. Industrial kicks, acid squelches, and relentless energy.",
        genre: "electronic",
        tags: ["techno", "industrial", "acid"],
        mood_tags: ["dark", "intense", "industrial"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Sunrise Set",
        description: "Melodic house for the afterparty. Uplifting pads, warm bass, and euphoric breakdowns.",
        genre: "electronic",
        tags: ["melodic-house", "uplifting", "sunrise"],
        mood_tags: ["euphoric", "uplifting", "blissful"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Binary",
        description: "Glitchy, experimental electronic. Chopped breaks, digital artifacts, and unexpected drops.",
        genre: "electronic",
        tags: ["experimental", "glitch", "breaks"],
        mood_tags: ["experimental", "chaotic", "futuristic"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Club Edit Pack",
        description: "Five exclusive club edits of unreleased tracks. Premium only.",
        genre: "electronic",
        tags: ["club", "exclusive", "dj-tools"],
        mood_tags: ["energetic", "club", "exclusive"],
        pricing_model: "subscription",
        is_premium: true,
      },
    ],
  },
  {
    creator: {
      display_name: "Sofia Reyes",
      username: "sofiareyes",
      email: "sofiareyes@example.test",
      password: newSeedPassword(),
      bio: "Latin pop and reggaeton artist from Mexico City. Bilingual tracks with infectious rhythms.",
    },
    tracks: [
      {
        title: "Fuego",
        description: "Reggaeton banger with Latin percussion, dembow rhythms, and fiery Spanish vocals.",
        genre: "latin",
        tags: ["reggaeton", "latin", "dance"],
        mood_tags: ["fiery", "dance", "passionate"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Baila Conmigo",
        description: "Dance with me — a Latin pop invitation. Tropical guitars, claps, and bilingual lyrics.",
        genre: "latin",
        tags: ["latin-pop", "tropical", "bilingual"],
        mood_tags: ["fun", "dance", "summer"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Corazón",
        description: "A heartfelt Latin ballad about lost love. Acoustic guitar and emotional vocals.",
        genre: "latin",
        tags: ["ballad", "acoustic", "emotional"],
        mood_tags: ["emotional", "longing", "beautiful"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Ritmo",
        description: "Upbeat Latin house fusion. Electronic beats meet traditional Latin percussion.",
        genre: "latin",
        tags: ["latin-house", "fusion", "electronic"],
        mood_tags: ["energetic", "dance", "party"],
        pricing_model: "free",
        is_premium: false,
      },
    ],
  },
  {
    creator: {
      display_name: "Jazz Collective",
      username: "jazzcollective",
      email: "jazzcollective@example.test",
      password: newSeedPassword(),
      bio: "A rotating collective of jazz musicians from New York. Standards, originals, and live sessions.",
    },
    tracks: [
      {
        title: "Blue Note Sessions Vol. 1",
        description: "Live trio recording — piano, bass, drums. Classic jazz standards with fresh arrangements.",
        genre: "jazz",
        tags: ["live", "trio", "standards"],
        mood_tags: ["sophisticated", "smooth", "warm"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Autumn Leaves (Live)",
        description: "A classic reimagined. Brushed drums, walking bass, and lyrical piano improvisation.",
        genre: "jazz",
        tags: ["standard", "live", "piano"],
        mood_tags: ["melancholy", "elegant", "autumn"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Modal Sketches",
        description: "Original modal jazz composition. Exploratory solos over shifting harmonies.",
        genre: "jazz",
        tags: ["modal", "original", "exploratory"],
        mood_tags: ["contemplative", "experimental", "deep"],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Late Night Quartet",
        description: "Saxophone-led quartet playing after hours. Smoky, intimate, and unhurried.",
        genre: "jazz",
        tags: ["saxophone", "quartet", "after-hours"],
        mood_tags: ["intimate", "smoky", "late-night"],
        pricing_model: "free",
        is_premium: false,
      },
    ],
  },
];

// ── Seeding Logic ─────────────────────────────────────────────────────────────

async function getOrCreateArtist(creator: ArtistDefinition["creator"]): Promise<string> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", creator.username)
    .maybeSingle();

  if (existing) {
    console.log(`   ✅ Artist "${creator.display_name}" already exists (${existing.id})`);
    return existing.id;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: creator.email,
    password: creator.password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const found = users?.users?.find((u) => u.email === creator.email);
      if (found) return found.id;
    }
    throw new Error(`Auth error: ${authError.message}`);
  }

  const userId = authData.user!.id;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: creator.display_name,
    username: creator.username,
    bio: creator.bio,
    is_creator: true,
    role: "creator",
    subscription_price_cents: creator.subscription_price_cents ?? null,
  });

  if (profileError) throw new Error(`Profile error: ${profileError.message}`);

  console.log(`   ✅ Artist "${creator.display_name}" created (${userId})`);
  return userId;
}

async function seedArtist(def: ArtistDefinition) {
  console.log(`\n🎵 Seeding artist: ${def.creator.display_name}`);

  const creatorId = await getOrCreateArtist(def.creator);

  for (const track of def.tracks) {
    // Check if already exists
    const { data: existing } = await supabase
      .from("videos")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("title", track.title)
      .eq("content_type", "music_video")
      .maybeSingle();

    if (existing) {
      console.log(`   ⏭️  "${track.title}" already exists, skipping`);
      continue;
    }

    const { error } = await supabase.from("videos").insert({
      creator_id: creatorId,
      title: track.title,
      description: track.description,
      genre: track.genre,
      content_type: "music_video",
      media_type: "music",
      tags: track.tags,
      mood_tags: track.mood_tags,
      pricing_model: track.pricing_model,
      is_premium: track.is_premium,
      price_cents: track.price_cents ?? null,
      is_published: true,
      published_at: new Date().toISOString(),
      is_processed: true,
    });

    if (error) {
      console.error(`   ❌ "${track.title}": ${error.message}`);
    } else {
      console.log(`   ✅ ${track.title} [${track.genre}]`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎵 Myriad Music Seeder");
  console.log("========================\n");

  for (const artist of ARTISTS) {
    await seedArtist(artist);
  }

  const totalTracks = ARTISTS.reduce((sum, a) => sum + a.tracks.length, 0);
  console.log("\n========================");
  console.log("🎉 Music seeding complete!");
  console.log(`   ${ARTISTS.length} artists, ${totalTracks} tracks`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
