-- ============================================================
-- UX REDESIGN — Database Changes
-- Per docs/UX-REDESIGN-SPEC.md
-- ============================================================

-- Videos: add premium flag, preview duration, trending flag
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS preview_duration_seconds integer DEFAULT 10;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false;

-- Backfill: mark existing paid videos as premium
UPDATE videos SET is_premium = true WHERE pricing_model != 'free' AND price_cents > 0;

-- Profiles: add star level and banner image
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS star_level integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;

-- ============================================================
-- Recalculate creator star levels
-- Called periodically (cron / edge function)
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_star_levels() RETURNS void AS $$
BEGIN
  -- Reset all to ☆ (New)
  UPDATE profiles SET star_level = 0 WHERE is_creator = true;

  -- ★ Rising: 1,000+ total views, 50+ followers, 3+ published videos
  UPDATE profiles SET star_level = 1
  WHERE is_creator = true
    AND id IN (
      SELECT creator_id FROM videos
      WHERE is_published = true
      GROUP BY creator_id
      HAVING SUM(view_count) >= 1000 AND COUNT(*) >= 3
    )
    AND follower_count >= 50;

  -- ★★ Established: 10K+ views, 500+ followers, 10+ videos, 50+ subscribers
  UPDATE profiles SET star_level = 2
  WHERE is_creator = true
    AND id IN (
      SELECT creator_id FROM videos
      WHERE is_published = true
      GROUP BY creator_id
      HAVING SUM(view_count) >= 10000 AND COUNT(*) >= 10
    )
    AND follower_count >= 500
    AND subscriber_count >= 50;

  -- ★★★ Top Creator: 100K+ views, 5K+ followers, 20+ videos, 500+ subscribers
  UPDATE profiles SET star_level = 3
  WHERE is_creator = true
    AND id IN (
      SELECT creator_id FROM videos
      WHERE is_published = true
      GROUP BY creator_id
      HAVING SUM(view_count) >= 100000 AND COUNT(*) >= 20
    )
    AND follower_count >= 5000
    AND subscriber_count >= 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Recalculate trending videos (top 10% by engagement, last 7 days)
-- Called periodically (cron / edge function)
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_trending_videos() RETURNS void AS $$
DECLARE
  threshold numeric;
BEGIN
  -- Calculate the engagement score at the 90th percentile
  SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (
    ORDER BY (
      (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id AND vv.created_at > NOW() - INTERVAL '7 days') * 1.0 +
      v.like_count * 2.0 +
      v.purchase_count * 3.0
    )
  ) INTO threshold
  FROM videos v
  WHERE v.is_published = true;

  -- Reset all
  UPDATE videos SET is_trending = false WHERE is_trending = true;

  -- Mark top 10%
  IF threshold IS NOT NULL AND threshold > 0 THEN
    UPDATE videos SET is_trending = true
    WHERE is_published = true
      AND (
        (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = videos.id AND vv.created_at > NOW() - INTERVAL '7 days') * 1.0 +
        like_count * 2.0 +
        purchase_count * 3.0
      ) >= threshold;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Updated trending_videos view (includes new columns)
-- Must DROP + CREATE because v.* column set changed
-- ============================================================

DROP VIEW IF EXISTS trending_videos;
CREATE VIEW trending_videos AS
SELECT
  v.*,
  p.display_name AS creator_name,
  p.username AS creator_username,
  p.avatar_url AS creator_avatar,
  p.star_level AS creator_star_level,
  (
    (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id AND vv.created_at > NOW() - INTERVAL '7 days') * 1.0 +
    v.like_count * 2.0 +
    v.avg_rating * v.rating_count * 0.5 +
    v.purchase_count * 3.0
  ) AS trending_score
FROM videos v
JOIN profiles p ON p.id = v.creator_id
WHERE v.is_published = TRUE
ORDER BY trending_score DESC;
