-- Simplified star level recalculation.
-- Level 0: New Creator (default)
-- Level 1: Rising Creator (auto: 3+ videos, 50+ views)
-- Levels 2-3 are admin-granted only and NOT overwritten here.

CREATE OR REPLACE FUNCTION recalculate_star_levels() RETURNS void AS $$
BEGIN
  -- Reset only level 0-1 creators (don't touch admin-granted level 2-3)
  UPDATE profiles SET star_level = 0
  WHERE is_creator = true AND star_level < 2;

  -- Level 1 (Rising Creator): 3+ published videos AND 50+ total views
  UPDATE profiles SET star_level = 1
  WHERE is_creator = true AND star_level < 2
    AND id IN (
      SELECT creator_id FROM videos
      WHERE is_published = true
      GROUP BY creator_id
      HAVING COUNT(*) >= 3
    )
    AND total_views >= 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
