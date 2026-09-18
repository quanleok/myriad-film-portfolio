-- Seed initial journal posts with useful content
-- Uses the first admin user as author; falls back gracefully if none exists

DO $$
DECLARE
  v_author_id UUID;
BEGIN
  -- Find an admin user to use as author
  SELECT id INTO v_author_id FROM profiles WHERE is_admin = true LIMIT 1;
  IF v_author_id IS NULL THEN
    RAISE NOTICE 'No admin user found — skipping journal seed';
    RETURN;
  END IF;

  -- 1. PINNED: Founding Creators Program (headline post)
  INSERT INTO blog_posts (author_id, title, body, tags, is_pinned, is_published, published_at)
  VALUES (
    v_author_id,
    'The Founding Creators Program Is Live — 0% Platform Fee for Your First Year',
    'We''re opening Myriad to a small group of founding creators who believe AI filmmaking deserves a real marketplace — not another social feed.

If you''re accepted into the Founding Creators Program, here''s what you get:

**Year 1: 0% platform fee.** Every dollar your backers spend goes to you. No cut, no catch.

**After year 1: 10% for life.** Our standard rate is 20%, but founding creators lock in half that — permanently.

**Why we''re doing this.** Myriad only works if great creators launch great projects. We''d rather invest in you now and grow together than charge full price to an empty room.

**How to apply.** Head to [/founding-creators](/founding-creators) and fill out the short application. We review every submission personally. If you have an invite code from an existing founding creator, you can skip the line.

**What we''re looking for.** You don''t need a finished film. You need a concept worth backing — a teaser, characters, a world people want to explore. If you''re making AI films and you''re serious about it, apply.

The window won''t stay open forever. Early creators shape the platform.',
    ARRAY['announcement', 'founding-creators'],
    true, true, NOW()
  ) ON CONFLICT DO NOTHING;

  -- 2. Getting Started: How Myriad Works
  INSERT INTO blog_posts (author_id, title, body, tags, is_pinned, is_published, published_at)
  VALUES (
    v_author_id,
    'How Myriad Works: From Concept to Premiere in 4 Steps',
    'Myriad is a preorder marketplace for unreleased AI films. Here''s the full lifecycle of a project:

**1. Create your project page.**
This is your pitch. Upload a teaser, introduce your characters, share concept art, and write a synopsis. Think of it as a movie poster that people can interact with. Use the composer at [/projects/new](/projects/new) — it autosaves as you go.

**2. Set your preorder campaign.**
Pick a price ($3–$100), an unlock target (how many preorders you need), and a campaign window (14–30 days). When you hit your target, the project "greenlights" automatically. If you reach 50–99%, you get 48 hours to decide whether to proceed.

**3. Make the film.**
Once greenlit, you enter production. Post updates, share progress, and keep your backers engaged. You pick your production window (30–180 days) when you create the project.

**4. Deliver and premiere.**
Upload your finished film, schedule a premiere date, and launch it. Backers watch the premiere together with live chat. After the premiere, your film is available for purchase by anyone at the release price.

**What if the project doesn''t unlock?**
All backers are automatically refunded. Myriad absorbs the Stripe processing fees — backers lose nothing.

**What about payouts?**
New creators receive their funds after delivering the film. Creators with 1+ delivered projects get 70% at greenlight and the remaining 30% after delivery.',
    ARRAY['tutorial', 'getting-started'],
    false, true, NOW() - INTERVAL '1 hour'
  ) ON CONFLICT DO NOTHING;

  -- 3. Tutorial: Creating a Great Project Page
  INSERT INTO blog_posts (author_id, title, body, tags, is_pinned, is_published, published_at)
  VALUES (
    v_author_id,
    'Creating a Project Page That Converts: Tips for Creators',
    'Your project page is your storefront. Here''s what makes the difference between a project that unlocks and one that doesn''t.

**Lead with the teaser.** This is the first thing people see. It doesn''t need to be a final trailer — a mood piece, a character reveal, or an atmospheric clip works. 30–90 seconds is the sweet spot.

**Characters sell stories.** Add 3–5 character cards with images and short descriptions. People back projects they connect with emotionally — characters create that connection.

**Concept art builds the world.** Even rough concept art helps backers visualize what they''re preordering. Show environments, key scenes, or visual development work.

**Write a hook that fits in a tweet.** Your hook appears on cards across the platform. Make it punchy, specific, and intriguing. "A samurai AI awakens in Neo-Kyoto" beats "An exciting sci-fi adventure."

**Set a realistic unlock target.** Lower targets unlock faster and build momentum. A project with 50/50 preorders looks alive. A project with 50/2000 looks abandoned. Start modest.

**Price with intent.** $5–$15 is the sweet spot for most projects. Lower prices get more volume. Higher prices signal premium quality. Your release price must be equal to or higher than your preorder price.

**Share early, share often.** Use the share button on your project page. The platform helps, but your first 20 backers will come from your own network.',
    ARRAY['tutorial', 'creator-tips'],
    false, true, NOW() - INTERVAL '2 hours'
  ) ON CONFLICT DO NOTHING;

  -- 4. Platform Update: What's New on Myriad
  INSERT INTO blog_posts (author_id, title, body, tags, is_pinned, is_published, published_at)
  VALUES (
    v_author_id,
    'Platform Update: Series Support, Community Feed, and More',
    'A quick rundown of what''s landed on Myriad recently:

**Episodic series.** Creators can now launch multi-episode projects (2–50 episodes). Each episode gets its own premiere. Set your episode count in the composer under "Format."

**Community feed.** Share work-in-progress, behind-the-scenes content, and quick updates in the community tab. It''s a lighter-weight way to stay visible between project launches.

**Production progress.** Backers can now see how far along a project is during production. Creators update this from the dashboard — it shows as a progress bar on the project page.

**Premiere scheduling.** When you deliver your film, you now schedule the premiere date right in the delivery flow. No separate step needed.

**Browse filters.** The browse page now has quick filters for lifecycle status (unlocking, in production, released) so viewers can find exactly what they''re looking for.

**Creator profiles.** Your profile now shows your delivery track record — how many films you''ve delivered and your standing. This builds trust with potential backers.

More coming soon. If you have feedback, reach out through the community feed or email us.',
    ARRAY['platform-update', 'changelog'],
    false, true, NOW() - INTERVAL '3 hours'
  ) ON CONFLICT DO NOTHING;

  -- 5. Why AI Films Need a Marketplace
  INSERT INTO blog_posts (author_id, title, body, tags, is_pinned, is_published, published_at)
  VALUES (
    v_author_id,
    'Why AI Films Deserve Their Own Marketplace',
    'AI filmmaking is exploding. Every week, new tools make it possible for small teams — sometimes one person — to create cinematic work that would have required a studio five years ago.

But where do these films go?

Right now, most AI films end up as social media posts. A 2-minute clip on Twitter, maybe a YouTube upload. They get likes, maybe go viral for a day, and then disappear. The creator gets exposure but no revenue. No audience. No way to build a career.

**The problem isn''t the tools. It''s the distribution.**

YouTube is built for ad-supported content. Netflix is built for licensed content. Neither is built for independent AI filmmakers who want to sell directly to an audience that wants to see their next project made.

**That''s what Myriad is for.**

We give creators a surface that treats their concept as the product — not just the finished film, but the world, the characters, the vision. Backers preorder because they believe in what''s coming. If enough people agree, the project greenlights and the creator gets funded to make it.

No ads. No algorithm. No middleman deciding what gets distributed. Just creators and the people who want to watch what they make.

If you''re making AI films, [create your first project](/projects/new) or [apply for the Founding Creators Program](/founding-creators) to launch with 0% fees.',
    ARRAY['editorial', 'ai-films'],
    false, true, NOW() - INTERVAL '4 hours'
  ) ON CONFLICT DO NOTHING;
END $$;
