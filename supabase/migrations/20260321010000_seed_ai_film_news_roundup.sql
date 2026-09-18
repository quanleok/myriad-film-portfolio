-- Seed official Myriad News coverage for notable AI filmmaking drops

DO $$
DECLARE
  v_author_id UUID;
BEGIN
  SELECT id INTO v_author_id
  FROM profiles
  WHERE is_admin = true
  LIMIT 1;

  IF v_author_id IS NULL THEN
    RAISE NOTICE 'No admin user found — skipping AI film news roundup seed';
    RETURN;
  END IF;

  INSERT INTO blog_posts (
    author_id,
    slug,
    title,
    body,
    tags,
    is_pinned,
    is_published,
    published_at,
    source_platform,
    source_url,
    source_creator_name,
    source_creator_handle,
    source_creator_url,
    source_title,
    source_preview_image_url,
    source_preview_quote,
    news_category
  )
  VALUES
  (
    v_author_id,
    'jsfilmz-seedance-krak-fantasy-teaser',
    'JSFILMZ drops The Krak',
    'JSFILMZ''s The Krak is one of the better recent fantasy drops built with Seedance. It keeps the mood steady, sells the creature tension early, and feels more like a real teaser than a loose visual test.

The main strength is control. The environments, pacing, and darker fantasy look all stay pointed in the same direction, which is where a lot of quick AI clips usually fall apart.

If you are tracking medieval or creature-driven AI shorts, this is one worth watching.',
    ARRAY['ai-film', 'fantasy', 'medieval', 'seedance', 'creator-spotlight'],
    false,
    true,
    NOW(),
    'youtube',
    'https://www.youtube.com/watch?v=i8PwaykrBvA',
    'JSFILMZ',
    'JSFILMZ0412',
    'https://x.com/JSFILMZ0412',
    'Seedance 2.0 The Krak',
    'https://i.ytimg.com/vi/i8PwaykrBvA/maxresdefault.jpg',
    'A dark fantasy teaser with strong mood, creature tension, and a world that already feels usable.',
    'creator_spotlight'
  ),
  (
    v_author_id,
    'logan-paul-dor-brothers-ai-action-teaser',
    'Logan Paul''s DOR Brothers release pushes realistic AI action transitions into blockbuster territory',
    'The newest Logan Paul upload made with the DOR Brothers is one of the stronger examples of AI action filmmaking at a bigger scale. "We Made a $300,000,000 Movie in 7 Days Using AI" is built around camera movement, transition design, and a glossy action grammar that holds together far better than most AI-first spectacle pieces.

The reason it lands is not just polish. It understands sequencing. Shots connect with intent, the action geography stays legible, and the piece keeps escalating without falling apart visually every few seconds.

If the current benchmark for AI action is "does this feel like a real trailer instead of disconnected shots," this one clears that bar comfortably.',
    ARRAY['ai-film', 'action', 'camera-transitions', 'dor-brothers', 'creator-spotlight'],
    false,
    true,
    NOW() - INTERVAL '5 minutes',
    'youtube',
    'https://www.youtube.com/watch?v=wNKaYvhTauM',
    'Logan Paul',
    NULL,
    'https://www.youtube.com/channel/UCG8rbF3g2AMX70yOd8vqIZg',
    'We Made a $300,000,000 Movie in 7 Days Using AI',
    'https://i.ytimg.com/vi/wNKaYvhTauM/maxresdefault.jpg',
    'A high-gloss AI action piece with realistic transitions, readable movement, and stronger shot continuity than most of the field.',
    'trend'
  ),
  (
    v_author_id,
    'higgsfield-arena-zero-episode-one',
    'Higgsfield''s Arena Zero pilot is one of the more solid AI-native story launches so far',
    'Higgsfield AI''s "World''s First Ever AI Action Series - Arena Zero Ep.1" matters because it is trying to be a real episode, not just a style reel. The pilot puts more emphasis on setup, pacing, and narrative propulsion than a lot of AI video work that still stops at isolated moments.

That story-first choice is what makes it worth tracking. The script holds together, the world building feels intentional, and the episode format gives the release a clearer reason to exist beyond pure technical flex.

For anyone paying attention to where AI filmmaking goes next, projects like Arena Zero are useful because they test whether audiences will stay for an actual serialized story, not just a trailer-like concept.',
    ARRAY['ai-film', 'series', 'higgsfield', 'arena-zero', 'film-release'],
    false,
    true,
    NOW() - INTERVAL '10 minutes',
    'youtube',
    'https://www.youtube.com/watch?v=qqcH-1Rk-ow',
    'Higgsfield AI',
    NULL,
    'https://www.youtube.com/channel/UCh13OyDSm-Kb8ij3yZArtFg',
    'World''s First Ever AI Action Series - Arena Zero Ep.1',
    'https://i.ytimg.com/vi_webp/qqcH-1Rk-ow/maxresdefault.webp',
    'A more story-driven AI action pilot that focuses on script, pacing, and serial worldbuilding instead of just isolated spectacle.',
    'film_release'
  ),
  (
    v_author_id,
    'dustin-hollywood-war-forever-sneak-peek',
    'Dustin Hollywood''s War Forever teaser channels war-film scale with game-trailer intensity',
    'Dustin Hollywood''s "SNEAK PEEK EXCLUSIVE - WAR FOREVER (2026)" lands because it commits to a clear lane: modern war-film intensity with the energy of a high-end command-and-control game cinematic.

The clip sells battlefield scale, pressure, and tone fast. It feels less interested in random AI flourishes and more interested in building a recognizable war-film vibe people can instantly place.

That clarity matters. Strong AI film work usually gets better when the creator chooses a precise reference lane and executes it with discipline, and this teaser does that well.',
    ARRAY['ai-film', 'war-film', 'dustin-hollywood', 'creator-spotlight', 'film-release'],
    false,
    true,
    NOW() - INTERVAL '15 minutes',
    'youtube',
    'https://www.youtube.com/watch?v=CVpfc7EkfUs',
    'DUSTIN HOLLYWOOD / NAKID PICTURES',
    'dustinhollywood',
    'https://x.com/dustinhollywood',
    'SNEAK PEEK EXCLUSIVE - WAR FOREVER (2026)',
    'https://i.ytimg.com/vi/CVpfc7EkfUs/maxresdefault.jpg',
    'A war-film teaser that mixes battlefield scale, pressure, and game-trailer intensity without losing the core tone.',
    'creator_spotlight'
  ),
  (
    v_author_id,
    'dan-codename-widuri-kling-omni',
    'DAN drops CODENAME: WIDURI',
    'CODENAME: WIDURI works because it picks a lane fast and stays in it. DAN gives it a clean sci-fi action look, a recognizable lead, and a tighter sense of tone than most short AI demo pieces.

It feels more like a real teaser than a model showcase. The camera choices are deliberate, the character reads quickly, and the whole thing feels built to hint at a bigger world.

For short-form AI action, this is a solid recent drop.',
    ARRAY['ai-film', 'sci-fi', 'action', 'kling', 'creator-spotlight'],
    false,
    true,
    NOW() - INTERVAL '2 minutes',
    'youtube',
    'https://www.youtube.com/watch?v=Kf6OW7T0urE',
    'DAN',
    'mxvdxn',
    'https://x.com/mxvdxn',
    'CODENAME: WIDURI // Kling 3.0 Omni',
    'https://i.ytimg.com/vi_webp/Kf6OW7T0urE/maxresdefault.webp',
    'A tight sci-fi action teaser with a clear lead, strong tone, and sharper camera choices than most quick AI drops.',
    'creator_spotlight'
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;
