-- Seed blog post: Seedance 2.0 best compilation

DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE is_admin = true LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found, skipping blog seed';
    RETURN;
  END IF;

  INSERT INTO blog_posts (author_id, title, body, media, cover_image_url, tags, is_pinned, is_published, published_at)
  VALUES (
    admin_id,
    'The Best of Seedance 2.0 — A Compilation That Shows Where AI Film Is Headed',
    'If you''ve been following the AI filmmaking space, you already know Seedance 2.0 is the real deal. But seeing individual clips is one thing — watching a full compilation of the best work is something else entirely.

This compilation pulls together some of the most striking footage generated with Seedance 2.0, and the range is genuinely jaw-dropping. Cinematic slow-motion shots with perfect lighting. Character close-ups with subtle facial expressions that actually land. Action sequences with coherent physics. Environments that feel lived-in rather than AI-hallucinated.

What stands out most isn''t any single clip — it''s the consistency. Six months ago, you''d get one impressive shot out of twenty attempts. Now creators are producing entire sequences where every frame holds up. That''s not a small improvement. That''s the difference between a tech demo and a filmmaking tool.

A few things to watch for in this compilation:

The motion quality. Characters walk, turn, and gesture with natural weight. No more floaty AI movement where people seem to glide rather than step. Seedance 2.0 has clearly made a breakthrough in understanding how bodies move through space.

The camera work. These aren''t static shots with AI movement pasted on top. The virtual camera tracks, pans, and follows action with the kind of intentionality you expect from a human cinematographer. Dolly moves, rack focus, handheld energy — it''s all there.

The lighting. This is where AI video has historically looked most artificial. Flat, overlit, no atmosphere. These clips have depth. Rim lighting, volumetric haze, golden hour warmth, neon reflections. It feels like someone actually lit these scenes.

We''re at an inflection point. The tools are now good enough that the limiting factor isn''t technology — it''s vision. The creators who understand story, composition, and emotion are going to make things that blow people''s minds. The ones who just type prompts and hit generate will make forgettable content.

That''s why Myriad exists. We''re building the platform where AI filmmakers with real vision can fund, produce, and premiere their work. If this compilation excites you, wait until you see what creators build when they have an audience backing them from day one.',
    '[{"url":"https://www.youtube.com/watch?v=1wA__d3-T_w","type":"video","caption":"Seedance 2.0 Best Compilation — the most impressive AI-generated footage to date"}]'::jsonb,
    null,
    ARRAY['seedance', 'ai-filmmaking', 'compilation'],
    false,
    true,
    now()
  );

END $$;
