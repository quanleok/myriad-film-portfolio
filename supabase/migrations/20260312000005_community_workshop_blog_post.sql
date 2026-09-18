-- New pinned post about Community & Workshop features
-- First unpin the current pinned post, then insert new one as pinned

UPDATE blog_posts SET is_pinned = false WHERE is_pinned = true;

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
    'Introducing Myriad Community & Workshop — Build Films Together',
    'We''re building something bigger than a marketplace. Myriad is becoming the home base for AI filmmakers — a place to connect, collaborate, and build your next project from concept to final cut.

Today we''re announcing two major features coming to Myriad: Community and Workshop.

COMMUNITY — YOUR CREATIVE FEED

The AI filmmaking community is scattered across Twitter threads, Discord servers, and Reddit posts. There''s no dedicated space where creators can share work, get feedback, and build relationships with the people making this new art form.

Myriad Community changes that. Think of it as your creative feed — a place to post daily experiments, behind-the-scenes breakdowns, work-in-progress clips, and technique discoveries. Share what you''re learning. See what others are building. Find your collaborators.

This isn''t a general social feed. It''s purpose-built for AI filmmaking. Every post, every discussion, every piece of feedback is in the context of making films with AI.

WORKSHOP — YOUR PRODUCTION STUDIO

Here''s the feature we''re most excited about. Workshop is where you compose your entire film production — story, characters, scenes, shots — all in one place.

Right now, most AI filmmakers work across a dozen tools: Google Docs for scripts, Pinterest boards for references, spreadsheets for shot lists, folders full of generated images sorted by filename. It''s chaos. And when you''re trying to maintain character consistency across 50+ shots, chaos kills your project.

Workshop gives you a single workspace for everything:

Story & Script — Outline your narrative, write your scenes, track your story beats. Everything connected so you can see how changes ripple through the whole production.

Character Bible — Define your characters with reference images, description sheets, and prompt templates. Keep them consistent across every scene and every generation tool.

Scene Composer — Break your film into scenes and shots. Attach reference images, prompts, and generated outputs to each shot. See your film take shape visually before you commit to final renders.

AI Tool Pipeline — Workshop is built for the way AI filmmaking actually works. Organize your Seedance prompts, Kling generations, Runway outputs, and whatever tool comes next. Compare variations. Pick winners. Build your edit.

COLLABORATION — FILMS ARE TEAM PROJECTS

The solo AI filmmaker is real — but so is the team. Some of the best AI films we''ve seen come from small crews: one person on story, another on visual direction, someone else on music and sound design.

Workshop supports collaboration from day one. Invite other creators into your project. Assign scenes. Share assets. Review each other''s work. AI filmmaking doesn''t have to be a solo grind.

WHEN?

Community is in early development now. Workshop is in design and will follow. We''re building these in public — expect updates here as we make progress.

If you''re an AI filmmaker and you want to be among the first to try these features, create your Myriad account and join the community. We''re building this for you, and your feedback shapes everything.',
    '[]'::jsonb,
    null,
    ARRAY['community', 'workshop', 'announcement', 'myriad'],
    true,
    true,
    now()
  );

END $$;
