-- Extend blog_posts into the official News feed source of truth

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_creator_name TEXT,
  ADD COLUMN IF NOT EXISTS source_creator_handle TEXT,
  ADD COLUMN IF NOT EXISTS source_creator_url TEXT,
  ADD COLUMN IF NOT EXISTS source_title TEXT,
  ADD COLUMN IF NOT EXISTS source_preview_image_url TEXT,
  ADD COLUMN IF NOT EXISTS source_preview_quote TEXT,
  ADD COLUMN IF NOT EXISTS news_category TEXT,
  ADD COLUMN IF NOT EXISTS like_count_cache INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count_cache INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_source_platform_check'
  ) THEN
    ALTER TABLE blog_posts
      ADD CONSTRAINT blog_posts_source_platform_check
      CHECK (
        source_platform IS NULL
        OR source_platform IN ('youtube', 'x', 'other')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_posts_news_category_check'
  ) THEN
    ALTER TABLE blog_posts
      ADD CONSTRAINT blog_posts_news_category_check
      CHECK (
        news_category IS NULL
        OR news_category IN (
          'creator_spotlight',
          'trend',
          'tool_release',
          'film_release',
          'industry_news'
        )
      );
  END IF;
END $$;

WITH prepared AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        trim(
          BOTH '-' FROM regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')
        ),
        ''
      ),
      'news'
    ) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        NULLIF(
          trim(
            BOTH '-' FROM regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')
          ),
          ''
        ),
        'news'
      )
      ORDER BY created_at, id
    ) AS slug_rank
  FROM blog_posts
)
UPDATE blog_posts AS posts
SET slug = CASE
  WHEN prepared.slug_rank = 1 THEN prepared.base_slug
  ELSE prepared.base_slug || '-' || prepared.slug_rank::TEXT
END
FROM prepared
WHERE posts.id = prepared.id
  AND COALESCE(posts.slug, '') = '';

ALTER TABLE blog_posts
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug
  ON blog_posts (slug);

CREATE INDEX IF NOT EXISTS idx_blog_posts_news_category
  ON blog_posts (news_category, published_at DESC)
  WHERE is_published = true;

CREATE TABLE IF NOT EXISTS blog_post_likes (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE blog_post_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blog_post_likes'
      AND policyname = 'Service role full access to blog_post_likes'
  ) THEN
    CREATE POLICY "Service role full access to blog_post_likes"
      ON blog_post_likes
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS blog_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES blog_post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE blog_post_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blog_post_comments'
      AND policyname = 'Service role full access to blog_post_comments'
  ) THEN
    CREATE POLICY "Service role full access to blog_post_comments"
      ON blog_post_comments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_post_comments_post_created
  ON blog_post_comments (post_id, created_at ASC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS blog_post_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE blog_post_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blog_post_events'
      AND policyname = 'Service role full access to blog_post_events'
  ) THEN
    CREATE POLICY "Service role full access to blog_post_events"
      ON blog_post_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_post_events_post_created
  ON blog_post_events (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_post_events_type_created
  ON blog_post_events (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION update_blog_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts
    SET like_count_cache = like_count_cache + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts
    SET like_count_cache = GREATEST(like_count_cache - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_post_like_count ON blog_post_likes;
CREATE TRIGGER trg_blog_post_like_count
  AFTER INSERT OR DELETE ON blog_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_blog_post_like_count();

CREATE OR REPLACE FUNCTION update_blog_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts
    SET comment_count_cache = comment_count_cache + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts
    SET comment_count_cache = GREATEST(comment_count_cache - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_post_comment_count ON blog_post_comments;
CREATE TRIGGER trg_blog_post_comment_count
  AFTER INSERT OR DELETE ON blog_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_blog_post_comment_count();
