-- ============================================================
-- "Not Interested" System + Block Creator
-- ============================================================

-- 1. Video dislikes ("Not Interested")
CREATE TABLE video_dislikes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_video_dislikes_user ON video_dislikes(user_id);
CREATE INDEX idx_video_dislikes_video ON video_dislikes(video_id);

ALTER TABLE video_dislikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dislikes" ON video_dislikes
  FOR ALL USING (auth.uid() = user_id);

-- Add dislike_count to videos
ALTER TABLE videos ADD COLUMN IF NOT EXISTS dislike_count INTEGER NOT NULL DEFAULT 0;

-- Trigger to maintain dislike_count
CREATE OR REPLACE FUNCTION update_dislike_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET dislike_count = dislike_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET dislike_count = dislike_count - 1 WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_dislike_change
  AFTER INSERT OR DELETE ON video_dislikes
  FOR EACH ROW EXECUTE FUNCTION update_dislike_count();

-- 2. Blocked creators
CREATE TABLE blocked_creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, creator_id)
);

CREATE INDEX idx_blocked_creators_user ON blocked_creators(user_id);

ALTER TABLE blocked_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON blocked_creators
  FOR ALL USING (auth.uid() = user_id);

-- 3. Update trending formula to factor in dislikes
-- New formula: views + (likes * 3) - (dislikes * 5), exclude high dislike ratios
CREATE OR REPLACE FUNCTION recalculate_trending_videos() RETURNS void AS $$
DECLARE
  threshold numeric;
BEGIN
  SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (
    ORDER BY (
      (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id AND vv.created_at > NOW() - INTERVAL '7 days') * 1.0 +
      v.like_count * 3.0 -
      v.dislike_count * 5.0
    )
  ) INTO threshold
  FROM videos v
  WHERE v.is_published = true
    -- Exclude videos with >30% dislike ratio
    AND (v.like_count + v.dislike_count = 0 OR v.dislike_count::numeric / (v.like_count + v.dislike_count) < 0.3);

  -- Reset all
  UPDATE videos SET is_trending = false WHERE is_trending = true;

  -- Mark top 10% (excluding high dislike ratios)
  IF threshold IS NOT NULL AND threshold > 0 THEN
    UPDATE videos SET is_trending = true
    WHERE is_published = true
      AND (like_count + dislike_count = 0 OR dislike_count::numeric / (like_count + dislike_count) < 0.3)
      AND (
        (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = videos.id AND vv.created_at > NOW() - INTERVAL '7 days') * 1.0 +
        like_count * 3.0 -
        dislike_count * 5.0
      ) >= threshold;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate trending_videos view to include dislike_count
DROP VIEW IF EXISTS trending_videos;
CREATE VIEW trending_videos AS
SELECT
  v.*,
  p.display_name AS creator_name,
  p.username AS creator_username,
  p.avatar_url AS creator_avatar,
  p.star_level AS creator_star_level,
  (v.view_count * 1.0 + v.like_count * 3.0 - v.dislike_count * 5.0) AS trending_score
FROM videos v
JOIN profiles p ON v.creator_id = p.id
WHERE v.is_published = true
  AND v.is_trending = true
  -- Exclude videos with >50% dislike ratio from homepage rows
  AND (v.like_count + v.dislike_count = 0 OR v.dislike_count::numeric / (v.like_count + v.dislike_count) < 0.5)
ORDER BY (v.view_count * 1.0 + v.like_count * 3.0 - v.dislike_count * 5.0) DESC;
