-- ============================================================
-- Showcase: Community AI Video Gallery
-- ============================================================

-- Posts table
CREATE TABLE IF NOT EXISTS showcase_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),

  -- Media (Bunny CDN video only)
  bunny_video_id TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Tagging
  genre TEXT,
  ai_model TEXT NOT NULL,

  -- Stats
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,

  -- Moderation
  is_approved BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_showcase_posts_genre ON showcase_posts(genre) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_showcase_posts_ai_model ON showcase_posts(ai_model) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_showcase_posts_user ON showcase_posts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_showcase_posts_trending ON showcase_posts(like_count DESC, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_showcase_posts_created ON showcase_posts(created_at DESC) WHERE deleted_at IS NULL;

-- Likes table
CREATE TABLE IF NOT EXISTS showcase_likes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES showcase_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- Like count trigger
CREATE OR REPLACE FUNCTION update_showcase_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE showcase_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE showcase_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_showcase_like_count ON showcase_likes;
CREATE TRIGGER trg_showcase_like_count
  AFTER INSERT OR DELETE ON showcase_likes
  FOR EACH ROW EXECUTE FUNCTION update_showcase_like_count();

-- View count RPC (SECURITY DEFINER so unauthenticated users can increment)
CREATE OR REPLACE FUNCTION increment_showcase_view(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE showcase_posts SET view_count = view_count + 1 WHERE id = post_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE showcase_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public posts visible' AND tablename = 'showcase_posts') THEN
    CREATE POLICY "Public posts visible" ON showcase_posts FOR SELECT USING (is_approved = true AND deleted_at IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users create posts' AND tablename = 'showcase_posts') THEN
    CREATE POLICY "Users create posts" ON showcase_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users update own posts' AND tablename = 'showcase_posts') THEN
    CREATE POLICY "Users update own posts" ON showcase_posts FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own posts' AND tablename = 'showcase_posts') THEN
    CREATE POLICY "Users delete own posts" ON showcase_posts FOR DELETE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view likes' AND tablename = 'showcase_likes') THEN
    CREATE POLICY "Anyone can view likes" ON showcase_likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users create likes' AND tablename = 'showcase_likes') THEN
    CREATE POLICY "Users create likes" ON showcase_likes FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own likes' AND tablename = 'showcase_likes') THEN
    CREATE POLICY "Users delete own likes" ON showcase_likes FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;
