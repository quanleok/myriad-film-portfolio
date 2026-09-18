-- Add is_editors_pick column to videos for curated homepage section
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_editors_pick boolean NOT NULL DEFAULT false;

-- Recreate trending_videos view to include the new column
DROP VIEW IF EXISTS trending_videos;
CREATE VIEW trending_videos AS
SELECT
  v.*,
  p.display_name AS creator_name,
  p.username AS creator_username,
  p.avatar_url AS creator_avatar,
  p.star_level AS creator_star_level,
  (v.view_count * 1.0 + v.like_count * 2.0 + v.comment_count * 3.0) AS trending_score
FROM videos v
JOIN profiles p ON v.creator_id = p.id
WHERE v.is_published = true
  AND v.is_trending = true
ORDER BY (v.view_count * 1.0 + v.like_count * 2.0 + v.comment_count * 3.0) DESC;
