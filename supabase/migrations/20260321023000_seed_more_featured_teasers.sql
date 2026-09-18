DO $$
DECLARE
  v_now timestamptz := now();
  v_featured_creator_id uuid;
BEGIN
  SELECT id
  INTO v_featured_creator_id
  FROM public.profiles
  WHERE username = 'myriad_featured'
  LIMIT 1;

  IF v_featured_creator_id IS NULL THEN
    RAISE NOTICE 'Featured Drops profile not found — skipping teaser seed';
    RETURN;
  END IF;

  INSERT INTO public.projects (
    creator_id,
    slug,
    title,
    hook,
    synopsis,
    inspiration_line,
    genre,
    tone,
    format,
    runtime_minutes,
    teaser_thumbnail_url,
    external_teaser_url,
    lifecycle_status,
    launch_mode,
    moderation_status,
    visibility,
    rights_attested_at,
    creator_terms_version,
    content_rating,
    is_test
  )
  VALUES
  (
    v_featured_creator_id,
    'featured-drop-kuroikusa-black-war',
    'Featured Drop: Kuroikusa (Black War)',
    'Curated teaser page for The BlueDott Films'' Kuroikusa.',
    'This page spotlights "Kuroikusa (Black War) | AI Short Film | Bluedott Films" from The BlueDott Films.

The piece stands out for its darker war-fantasy texture and a stronger sense of battlefield tone than most quick AI short uploads. It lands best as a teaser-style proof point: atmosphere first, striking imagery second, and enough world signal to make the short feel bigger than a simple prompt experiment.

Use this page to watch the teaser in context.',
    'Featured drop • The BlueDott Films',
    'fantasy',
    'dark',
    'short_film',
    2,
    'https://i.ytimg.com/vi/OK5q-inHQsc/hqdefault.jpg',
    'https://www.youtube.com/watch?v=OK5q-inHQsc',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-ai-man-seedance',
    'Featured Drop: AI MAN',
    'Curated teaser page for Heydin''s AI MAN.',
    'This page spotlights "AI MAN | Made with Seedance 2.0 | AI Short Film" from Heydin.

AI MAN works as a clean Seedance-era sci-fi teaser because it keeps the premise readable fast. The visual identity is immediate, the central figure is memorable, and the overall framing feels designed to sell a concept instead of just wandering through disconnected model shots.

Use this page to watch the teaser in context.',
    'Featured drop • Heydin',
    'sci_fi',
    'tense',
    'short_film',
    4,
    'https://i.ytimg.com/vi/dp4-Sv0uVzE/hqdefault.jpg',
    'https://www.youtube.com/watch?v=dp4-Sv0uVzE',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-attempt-1043',
    'Featured Drop: ATTEMPT 1043',
    'Curated teaser page for OneSideMedia''s ATTEMPT 1043.',
    'This page spotlights "AI Short film | ATTEMPT 1043" from OneSideMedia.

The appeal here is the experimental short-film energy. ATTEMPT 1043 feels like a compact mood piece that leans into texture, ambiguity, and AI-short atmosphere rather than overexplaining itself. That makes it a good fit for the kind of teaser-first discovery surface we want to test on Myriad.

Use this page to watch the teaser in context.',
    'Featured drop • OneSideMedia',
    'drama',
    'surreal',
    'short_film',
    3,
    'https://i.ytimg.com/vi/z8Fk1iJJgMU/hqdefault.jpg',
    'https://www.youtube.com/watch?v=z8Fk1iJJgMU',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-the-waiting-room',
    'Featured Drop: THE WAITING ROOM',
    'Curated teaser page for Brad Clark''s THE WAITING ROOM.',
    'This page spotlights "THE WAITING ROOM | AI Short Film Made with Gemini 3, Nano Banana 2 & Veo 3" from Brad Clark.

The short stands out because it leans into concept-first suspense instead of trying to show everything at once. The setup feels intentional, the mood is readable fast, and the whole piece carries a cleaner narrative hook than a lot of tool-demo style uploads.

Use this page to watch the teaser in context.',
    'Featured drop • Brad Clark',
    'sci_fi',
    'tense',
    'short_film',
    4,
    'https://i.ytimg.com/vi/bYW_7rWjQMs/hqdefault.jpg',
    'https://www.youtube.com/watch?v=bYW_7rWjQMs',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-replaced-by-ai',
    'Featured Drop: REPLACED BY AI!',
    'Curated teaser page for Rogue Cell Pictures'' REPLACED BY AI!.',
    'This page spotlights "REPLACED BY AI! | Seedance 2 + Kling 3.0 Short Film" from Rogue Cell Pictures.

The piece works because it knows its commercial hook immediately. It plays like a concise satirical sci-fi short with a clear premise, readable staging, and enough visual discipline to feel like a packaged concept rather than loose experimentation.

Use this page to watch the teaser in context.',
    'Featured drop • Rogue Cell Pictures',
    'sci_fi',
    'humorous',
    'short_film',
    4,
    'https://i.ytimg.com/vi/gLTbl8Jfi4s/hqdefault.jpg',
    'https://www.youtube.com/watch?v=gLTbl8Jfi4s',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-discarded-companion',
    'Featured Drop: Discarded Companion',
    'Curated teaser page for AI Video School''s Discarded Companion.',
    'This page spotlights "AI Short Film: Discarded Companion — A Cinematic Sci-Fi Story" from AI Video School.

Discarded Companion feels closer to a story-led sci-fi short than many AI uploads in this lane. The title, premise, and presentation line up quickly, and that makes it a strong fit for a teaser-first discovery surface where viewers need to understand the idea fast.

Use this page to watch the teaser in context.',
    'Featured drop • AI Video School',
    'sci_fi',
    'grounded',
    'short_film',
    4,
    'https://i.ytimg.com/vi/YY-M5bxTY28/hqdefault.jpg',
    'https://www.youtube.com/watch?v=YY-M5bxTY28',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-the-cleaner',
    'Featured Drop: THE CLEANER',
    'Curated teaser page for AI Director Dave Clark''s THE CLEANER.',
    'This page spotlights "THE CLEANER | Flow By Google | Veo 3 | Gen AI Short Film" from AI Director Dave Clark.

The short earns attention by keeping its central figure and tone sharp. It has enough cinematic shape to read like a real proof-of-concept short rather than a loose montage, and that makes it useful for testing what kind of AI film work people actually stop and engage with.

Use this page to watch the teaser in context.',
    'Featured drop • AI Director Dave Clark',
    'sci_fi',
    'dark',
    'short_film',
    4,
    'https://i.ytimg.com/vi/pD4q9zwWvRg/hqdefault.jpg',
    'https://www.youtube.com/watch?v=pD4q9zwWvRg',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-the-deal',
    'Featured Drop: THE DEAL',
    'Curated teaser page for Absolument AI Studio''s THE DEAL.',
    'This page spotlights "THE DEAL – A AI Short Film by Jérémy Gross" from Absolument AI Studio.

The piece stands out because it feels like a concise dramatic short instead of a model demo. It has enough compositional control and tonal commitment to read like a real teaser for a larger story world, which is exactly the kind of external drop worth testing inside a teaser-first discovery system.

Use this page to watch the teaser in context.',
    'Featured drop • Absolument AI Studio',
    'drama',
    'grounded',
    'short_film',
    3,
    'https://i.ytimg.com/vi/heywASepTps/hqdefault.jpg',
    'https://www.youtube.com/watch?v=heywASepTps',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-the-harvester',
    'Featured Drop: The Harvester',
    'Curated teaser page for DUST''s The Harvester.',
    'This page spotlights "Sci-Fi Short Film ''The Harvester'' | DUST | Online Premiere" from DUST.

The Harvester is a stronger benchmark piece because it carries full short-film discipline instead of just a tool-demo vibe. The presentation has real cinematic confidence, the world is legible fast, and the piece lands as a proper sci-fi story drop rather than a loose visual exercise.

Use this page to watch the teaser in context.',
    'Featured drop • DUST',
    'sci_fi',
    'dark',
    'short_film',
    9,
    'https://i.ytimg.com/vi/GbbprRV-2-s/hqdefault.jpg',
    'https://www.youtube.com/watch?v=GbbprRV-2-s',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  ),
  (
    v_featured_creator_id,
    'featured-drop-killing-of-a-machine',
    'Featured Drop: Killing of a Machine',
    'Curated teaser page for DUST''s Killing of a Machine.',
    'This page spotlights "Sci-Fi Short Film ''Killing of a Machine'' | DUST" from DUST.

The short is a strong example of why DUST still matters as a benchmark surface for cinematic sci-fi shorts. The premise lands quickly, the imagery is controlled, and the overall piece has the kind of polished short-film clarity that makes it useful as a featured teaser reference inside Myriad.

Use this page to watch the teaser in context.',
    'Featured drop • DUST',
    'sci_fi',
    'dark',
    'short_film',
    8,
    'https://i.ytimg.com/vi/7sQA6JvCtIw/hqdefault.jpg',
    'https://www.youtube.com/watch?v=7sQA6JvCtIw',
    'teaser',
    'teaser',
    'live',
    'public',
    v_now,
    'featured-drop-seed-v1',
    'teen',
    true
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    title = EXCLUDED.title,
    hook = EXCLUDED.hook,
    synopsis = EXCLUDED.synopsis,
    inspiration_line = EXCLUDED.inspiration_line,
    genre = EXCLUDED.genre,
    tone = EXCLUDED.tone,
    format = EXCLUDED.format,
    runtime_minutes = EXCLUDED.runtime_minutes,
    teaser_thumbnail_url = EXCLUDED.teaser_thumbnail_url,
    external_teaser_url = EXCLUDED.external_teaser_url,
    lifecycle_status = EXCLUDED.lifecycle_status,
    launch_mode = EXCLUDED.launch_mode,
    moderation_status = EXCLUDED.moderation_status,
    visibility = EXCLUDED.visibility,
    rights_attested_at = EXCLUDED.rights_attested_at,
    creator_terms_version = EXCLUDED.creator_terms_version,
    content_rating = EXCLUDED.content_rating,
    is_test = EXCLUDED.is_test;
END $$;
