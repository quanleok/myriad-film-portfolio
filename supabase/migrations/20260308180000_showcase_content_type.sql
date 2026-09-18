-- Add content_type column to showcase_posts
ALTER TABLE showcase_posts ADD COLUMN IF NOT EXISTS content_type TEXT;

CREATE INDEX IF NOT EXISTS idx_showcase_posts_content_type
  ON showcase_posts(content_type) WHERE deleted_at IS NULL;

-- Update listing RPC to support content_type filter (preserves existing params)
CREATE OR REPLACE FUNCTION list_showcase_posts(
  p_genre TEXT DEFAULT NULL,
  p_ai_model TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'trending',
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  bunny_video_id TEXT,
  thumbnail_url TEXT,
  genre TEXT,
  content_type TEXT,
  ai_model TEXT,
  view_count INTEGER,
  like_count INTEGER,
  created_at TIMESTAMPTZ,
  profile_display_name TEXT,
  profile_username TEXT,
  profile_avatar_url TEXT,
  profile_is_creator BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_sort = 'newest' THEN
    RETURN QUERY
    SELECT
      post.id,
      post.user_id,
      post.title,
      post.description,
      post.bunny_video_id,
      post.thumbnail_url,
      post.genre,
      post.content_type,
      post.ai_model,
      post.view_count,
      post.like_count,
      post.created_at,
      profile.display_name,
      profile.username,
      profile.avatar_url,
      profile.is_creator
    FROM showcase_posts AS post
    JOIN profiles AS profile
      ON profile.id = post.user_id
    WHERE post.deleted_at IS NULL
      AND post.is_approved = true
      AND (p_genre IS NULL OR post.genre = p_genre)
      AND (p_ai_model IS NULL OR post.ai_model = p_ai_model)
      AND (p_before IS NULL OR post.created_at < p_before)
      AND (p_content_type IS NULL OR post.content_type = p_content_type)
    ORDER BY post.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT
      post.id,
      post.user_id,
      post.title,
      post.description,
      post.bunny_video_id,
      post.thumbnail_url,
      post.genre,
      post.content_type,
      post.ai_model,
      post.view_count,
      post.like_count,
      post.created_at,
      profile.display_name,
      profile.username,
      profile.avatar_url,
      profile.is_creator
    FROM showcase_posts AS post
    JOIN profiles AS profile
      ON profile.id = post.user_id
    WHERE post.deleted_at IS NULL
      AND post.is_approved = true
      AND (p_genre IS NULL OR post.genre = p_genre)
      AND (p_ai_model IS NULL OR post.ai_model = p_ai_model)
      AND (p_before IS NULL OR post.created_at < p_before)
      AND (p_content_type IS NULL OR post.content_type = p_content_type)
    ORDER BY
      (post.like_count::numeric / power((((extract(epoch FROM now()) - extract(epoch FROM post.created_at)) / 3600) + 2), 1.5)) DESC,
      post.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;
