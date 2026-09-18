-- ============================================================
-- SOCIAL ENGAGEMENT
-- Emoji reactions + creator community posts
-- ============================================================

-- -----------------------------
-- Video reactions
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.video_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('🔥','😍','🤯','😂','💀','👏','❤️','😢')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id, emoji)
);

ALTER TABLE public.video_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reactions" ON public.video_reactions;
CREATE POLICY "Anyone can read reactions"
  ON public.video_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Logged in users can react" ON public.video_reactions;
CREATE POLICY "Logged in users can react"
  ON public.video_reactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_reactions_video
  ON public.video_reactions(video_id);

-- -----------------------------
-- Creator community posts
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.creator_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 2000),
  post_type text NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'poll', 'announcement')),
  image_url text,
  poll_options jsonb,
  poll_votes jsonb NOT NULL DEFAULT '{}'::jsonb,
  poll_ends_at timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.creator_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.creator_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.creator_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.creator_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read posts" ON public.creator_posts;
CREATE POLICY "Public read posts"
  ON public.creator_posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read post likes" ON public.post_likes;
CREATE POLICY "Public read post likes"
  ON public.post_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read post comments" ON public.post_comments;
CREATE POLICY "Public read post comments"
  ON public.post_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read poll votes" ON public.poll_votes;
CREATE POLICY "Public read poll votes"
  ON public.poll_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Creators manage posts" ON public.creator_posts;
CREATE POLICY "Creators manage posts"
  ON public.creator_posts FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users manage likes" ON public.post_likes;
CREATE POLICY "Users manage likes"
  ON public.post_likes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage comments" ON public.post_comments;
CREATE POLICY "Users manage comments"
  ON public.post_comments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage votes" ON public.poll_votes;
CREATE POLICY "Users manage votes"
  ON public.poll_votes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_creator_posts_creator_created
  ON public.creator_posts(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post
  ON public.post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post
  ON public.poll_votes(post_id);

-- Keep updated_at in sync for edits.
CREATE OR REPLACE FUNCTION public.touch_creator_posts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_creator_posts_updated_at ON public.creator_posts;
CREATE TRIGGER tr_creator_posts_updated_at
  BEFORE UPDATE ON public.creator_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_creator_posts_updated_at();

-- Maintain creator_posts.poll_votes cache from poll_votes rows.
CREATE OR REPLACE FUNCTION public.refresh_creator_post_poll_votes()
RETURNS trigger AS $$
DECLARE
  target_post_id uuid;
  votes_json jsonb;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);

  SELECT COALESCE(jsonb_object_agg(option_text, vote_count), '{}'::jsonb)
  INTO votes_json
  FROM (
    SELECT option_text, COUNT(*)::int AS vote_count
    FROM public.poll_votes
    WHERE post_id = target_post_id
    GROUP BY option_text
  ) counts;

  UPDATE public.creator_posts
  SET poll_votes = votes_json,
      updated_at = now()
  WHERE id = target_post_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_poll_votes_refresh_insert ON public.poll_votes;
CREATE TRIGGER tr_poll_votes_refresh_insert
  AFTER INSERT ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_creator_post_poll_votes();

DROP TRIGGER IF EXISTS tr_poll_votes_refresh_update ON public.poll_votes;
CREATE TRIGGER tr_poll_votes_refresh_update
  AFTER UPDATE ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_creator_post_poll_votes();

DROP TRIGGER IF EXISTS tr_poll_votes_refresh_delete ON public.poll_votes;
CREATE TRIGGER tr_poll_votes_refresh_delete
  AFTER DELETE ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_creator_post_poll_votes();
