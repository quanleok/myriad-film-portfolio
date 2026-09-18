-- =============================================================================
-- Community Feature Migration
-- Renames showcase → community, adds intent/tool_tags/workflow columns,
-- creates community_comments, community_feedback_chips, community_demand_signals
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Rename tables
-- ---------------------------------------------------------------------------
ALTER TABLE showcase_posts RENAME TO community_posts;
ALTER TABLE showcase_likes RENAME TO community_likes;

-- Rename indexes
ALTER INDEX IF EXISTS idx_showcase_posts_genre RENAME TO idx_community_posts_genre;
ALTER INDEX IF EXISTS idx_showcase_posts_ai_model RENAME TO idx_community_posts_ai_model;
ALTER INDEX IF EXISTS idx_showcase_posts_user RENAME TO idx_community_posts_user;
ALTER INDEX IF EXISTS idx_showcase_posts_trending RENAME TO idx_community_posts_trending;
ALTER INDEX IF EXISTS idx_showcase_posts_created RENAME TO idx_community_posts_created;
ALTER INDEX IF EXISTS idx_showcase_posts_content_type RENAME TO idx_community_posts_content_type;

-- Rename trigger
ALTER TRIGGER trg_showcase_like_count ON community_likes RENAME TO trg_community_like_count;

-- Update like count trigger function to reference new table name
CREATE OR REPLACE FUNCTION update_showcase_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update view count RPC
CREATE OR REPLACE FUNCTION increment_showcase_view(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts SET view_count = view_count + 1 WHERE id = post_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also create a new-name alias so new code can use it
CREATE OR REPLACE FUNCTION increment_community_view(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE community_posts SET view_count = view_count + 1 WHERE id = p_post_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 2. New columns on community_posts
-- ---------------------------------------------------------------------------

CREATE TYPE community_post_intent AS ENUM (
  'feedback_wanted',
  'interest_check',
  'breakdown',
  'project_update'
);

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS intent community_post_intent,
  ADD COLUMN IF NOT EXISTS tool_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS workflow_notes text,
  ADD COLUMN IF NOT EXISTS converted_project_id uuid REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS feedback_chip_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS demand_signal_count integer DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_posts_intent
  ON community_posts(intent) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Feedback chip type enum
-- ---------------------------------------------------------------------------

CREATE TYPE community_chip_type AS ENUM (
  'story',
  'consistency',
  'audio',
  'pacing',
  'realism',
  'would_watch'
);

-- ---------------------------------------------------------------------------
-- 4. Demand signal type enum
-- ---------------------------------------------------------------------------

CREATE TYPE community_signal_type AS ENUM (
  'watch_this',
  'notify_me',
  'would_preorder'
);

-- ---------------------------------------------------------------------------
-- 5. community_comments
-- ---------------------------------------------------------------------------

CREATE TABLE community_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 1000),
  timecode_seconds integer CHECK (timecode_seconds IS NULL OR timecode_seconds >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_community_comments_post ON community_comments(post_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_community_comments_user ON community_comments(user_id);

-- Comment count trigger
CREATE OR REPLACE FUNCTION update_community_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_comment_count
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_community_comment_count();

-- ---------------------------------------------------------------------------
-- 6. community_feedback_chips
-- ---------------------------------------------------------------------------

CREATE TABLE community_feedback_chips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chip_type community_chip_type NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id, chip_type)
);

CREATE INDEX idx_community_chips_post ON community_feedback_chips(post_id);

-- Chip count trigger
CREATE OR REPLACE FUNCTION update_community_chip_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET feedback_chip_count = feedback_chip_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET feedback_chip_count = GREATEST(feedback_chip_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_chip_count
  AFTER INSERT OR DELETE ON community_feedback_chips
  FOR EACH ROW EXECUTE FUNCTION update_community_chip_count();

-- ---------------------------------------------------------------------------
-- 7. community_demand_signals
-- ---------------------------------------------------------------------------

CREATE TABLE community_demand_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type community_signal_type NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id, signal_type)
);

CREATE INDEX idx_community_signals_post ON community_demand_signals(post_id);

-- Signal count trigger
CREATE OR REPLACE FUNCTION update_community_signal_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET demand_signal_count = demand_signal_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET demand_signal_count = GREATEST(demand_signal_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_signal_count
  AFTER INSERT OR DELETE ON community_demand_signals
  FOR EACH ROW EXECUTE FUNCTION update_community_signal_count();

-- ---------------------------------------------------------------------------
-- 8. RLS on new tables
-- ---------------------------------------------------------------------------

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_feedback_chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_demand_signals ENABLE ROW LEVEL SECURITY;

-- Comments
CREATE POLICY "Anyone can read comments" ON community_comments FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Users create comments" ON community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON community_comments FOR UPDATE USING (auth.uid() = user_id);

-- Feedback chips
CREATE POLICY "Anyone can read chips" ON community_feedback_chips FOR SELECT USING (true);
CREATE POLICY "Users create chips" ON community_feedback_chips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own chips" ON community_feedback_chips FOR DELETE USING (auth.uid() = user_id);

-- Demand signals
CREATE POLICY "Anyone can read signals" ON community_demand_signals FOR SELECT USING (true);
CREATE POLICY "Users create signals" ON community_demand_signals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own signals" ON community_demand_signals FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. Aggregate RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_post_feedback_chips(p_post_id uuid)
RETURNS TABLE (chip_type community_chip_type, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT fc.chip_type, COUNT(*)::bigint
  FROM community_feedback_chips fc
  WHERE fc.post_id = p_post_id
  GROUP BY fc.chip_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_post_demand_signals(p_post_id uuid)
RETURNS TABLE (signal_type community_signal_type, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT ds.signal_type, COUNT(*)::bigint
  FROM community_demand_signals ds
  WHERE ds.post_id = p_post_id
  GROUP BY ds.signal_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 10. Updated listing RPC
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS list_showcase_posts(text, text, text, integer, integer, timestamptz, text);
DROP FUNCTION IF EXISTS list_showcase_posts(text, text, text, integer, integer, timestamptz);
DROP FUNCTION IF EXISTS list_showcase_posts(text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION list_community_posts(
  p_genre text DEFAULT NULL,
  p_ai_model text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_intent text DEFAULT NULL,
  p_sort text DEFAULT 'trending',
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0,
  p_before timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  bunny_video_id text,
  thumbnail_url text,
  genre text,
  content_type text,
  ai_model text,
  intent community_post_intent,
  tool_tags text[],
  workflow_notes text,
  converted_project_id uuid,
  view_count integer,
  like_count integer,
  comment_count integer,
  feedback_chip_count integer,
  demand_signal_count integer,
  created_at timestamptz,
  profile_display_name text,
  profile_username text,
  profile_avatar_url text,
  profile_is_creator boolean
) AS $$
BEGIN
  IF p_sort = 'newest' THEN
    RETURN QUERY
    SELECT
      p.id, p.user_id, p.title, p.description,
      p.bunny_video_id, p.thumbnail_url, p.genre, p.content_type,
      p.ai_model, p.intent, p.tool_tags, p.workflow_notes,
      p.converted_project_id,
      p.view_count, p.like_count, p.comment_count,
      p.feedback_chip_count, p.demand_signal_count,
      p.created_at,
      pr.display_name, pr.username, pr.avatar_url, pr.is_creator
    FROM community_posts p
    JOIN profiles pr ON pr.id = p.user_id
    WHERE p.deleted_at IS NULL
      AND p.is_approved = true
      AND (p_genre IS NULL OR p.genre = p_genre)
      AND (p_ai_model IS NULL OR p.ai_model = p_ai_model)
      AND (p_content_type IS NULL OR p.content_type = p_content_type)
      AND (p_intent IS NULL OR p.intent = p_intent::community_post_intent)
      AND (p_before IS NULL OR p.created_at < p_before)
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT
      p.id, p.user_id, p.title, p.description,
      p.bunny_video_id, p.thumbnail_url, p.genre, p.content_type,
      p.ai_model, p.intent, p.tool_tags, p.workflow_notes,
      p.converted_project_id,
      p.view_count, p.like_count, p.comment_count,
      p.feedback_chip_count, p.demand_signal_count,
      p.created_at,
      pr.display_name, pr.username, pr.avatar_url, pr.is_creator
    FROM community_posts p
    JOIN profiles pr ON pr.id = p.user_id
    WHERE p.deleted_at IS NULL
      AND p.is_approved = true
      AND (p_genre IS NULL OR p.genre = p_genre)
      AND (p_ai_model IS NULL OR p.ai_model = p_ai_model)
      AND (p_content_type IS NULL OR p.content_type = p_content_type)
      AND (p_intent IS NULL OR p.intent = p_intent::community_post_intent)
      AND (p_before IS NULL OR p.created_at < p_before)
    ORDER BY
      ((p.like_count + p.comment_count + p.feedback_chip_count + p.demand_signal_count)::numeric
        / power((((extract(epoch FROM now()) - extract(epoch FROM p.created_at)) / 3600) + 2), 1.5)) DESC,
      p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
