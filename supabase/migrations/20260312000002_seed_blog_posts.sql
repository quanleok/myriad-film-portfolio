-- Seed initial blog posts with YouTube video embeds
-- Uses the first admin profile as author

DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE is_admin = true LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found, skipping blog seed';
    RETURN;
  END IF;

  -- Post 1: Pinned hero — Seedance 2.0 overview
  INSERT INTO blog_posts (author_id, title, body, media, cover_image_url, tags, is_pinned, is_published, published_at)
  VALUES (
    admin_id,
    'Seedance 2.0 Is Here — And It Changes Everything for AI Filmmaking',
    'ByteDance just dropped Seedance 2.0, and the AI filmmaking community is losing its mind. This isn''t an incremental update — it''s a generational leap in video generation quality, motion coherence, and creative control.

What makes Seedance 2.0 different? The motion quality. Characters move with natural weight and fluidity. Camera work feels intentional, not random. And the consistency between shots has improved dramatically — meaning you can actually tell a story across multiple generations without characters morphing into different people.

Creators are already pushing it to its limits. We''re seeing everything from cinematic anime sequences to photorealistic short films that would have been impossible even three months ago. The pace of improvement in this space is staggering.

Below, we''ve collected some of the most impressive early work made with Seedance 2.0 and other cutting-edge AI video tools. These creators are pioneering a new art form — and we think you should know their names.

This is exactly the kind of content Myriad was built for. We believe AI filmmakers deserve a platform that takes their work seriously — not as a novelty, but as the future of cinema.',
    '[{"url":"https://www.youtube.com/watch?v=6D4_ZMnPx7I","type":"video","caption":"\"The Last Bloom\" — A short film made entirely with Seedance 2.0 & Kling 3.0 by Lennard Smith"},{"url":"https://www.youtube.com/watch?v=rYeuidNfMJE","type":"video","caption":"AI film trailer crafted with Seedance 2.0 by Alex Patrascu"}]'::jsonb,
    null,
    ARRAY['seedance', 'ai-filmmaking', 'news'],
    true,
    true,
    now() - interval '1 minute'
  );

  -- Post 2: Logan Paul AI movie news
  INSERT INTO blog_posts (author_id, title, body, media, cover_image_url, tags, is_pinned, is_published, published_at)
  VALUES (
    admin_id,
    'Logan Paul Is Making an AI Movie — Here''s What That Means',
    'Love him or hate him, Logan Paul just did something that matters for the AI filmmaking space: he announced he''s producing a full AI-generated movie. And whether this is a serious creative endeavor or a publicity stunt, the signal it sends is unmistakable — AI filmmaking has gone mainstream.

The announcement has sparked heated debate. Traditional filmmakers are skeptical. AI creators are cautiously optimistic. And everyone else is just curious what it''ll actually look like.

Here''s our take: the more high-profile projects that use AI filmmaking tools, the more legitimacy the entire space gains. It normalizes the idea that AI is a creative tool, not a replacement for human storytelling. The story, the vision, the direction — that''s still human. The tools are just getting better.

What we''re watching for: Will this open doors for independent AI filmmakers? Will studios start taking AI-native creators seriously? And most importantly — will the movie actually be any good?

We''ll be covering this story as it develops. In the meantime, check out the announcement below.',
    '[{"url":"https://www.youtube.com/watch?v=wNKaYvhTauM","type":"video","caption":"Logan Paul announces his AI movie project"}]'::jsonb,
    null,
    ARRAY['news', 'ai-filmmaking', 'industry'],
    false,
    true,
    now() - interval '2 minutes'
  );

  -- Post 3: AI anime and creative experiments
  INSERT INTO blog_posts (author_id, title, body, media, cover_image_url, tags, is_pinned, is_published, published_at)
  VALUES (
    admin_id,
    'AI Anime Is Getting Wild — From Trump in Venezuela to Cat vs Bruce Lee',
    'One of the most exciting things about AI filmmaking is the sheer creative chaos it enables. No budget constraints. No production timelines. Just pure imagination meeting increasingly powerful tools.

This week we spotted two pieces that perfectly capture the range of what people are making:

First up — an anime-style short featuring Donald Trump in Venezuela. Yes, really. It''s absurd, it''s beautifully rendered, and it''s exactly the kind of thing that could only exist in the AI filmmaking era. The animation quality is remarkable, with fluid character movement and detailed backgrounds that rival traditional anime studios.

Then there''s the instant classic: a cat fighting Bruce Lee. Shot with cinematic flair and surprisingly convincing martial arts choreography (for a cat, anyway). It''s funny, it''s well-made, and it''s gotten millions of views for a reason.

These might seem like joke videos, but look closer — the technical quality is genuinely impressive. The motion, the lighting, the camera work. This is what happens when creative people get powerful tools and zero gatekeepers.

We love seeing this kind of experimentation. It''s how new art forms are born.',
    '[{"url":"https://www.youtube.com/watch?v=qFIuVw8whbs","type":"video","caption":"AI anime: Trump in Venezuela — pushing the boundaries of AI animation"},{"url":"https://www.youtube.com/watch?v=xXpfmYvvGuc","type":"video","caption":"Cat vs Bruce Lee — AI-generated martial arts showdown"}]'::jsonb,
    null,
    ARRAY['ai-filmmaking', 'anime', 'creative'],
    false,
    true,
    now() - interval '3 minutes'
  );

END $$;
