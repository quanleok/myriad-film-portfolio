-- ============================================================
-- Myriad Trending Algorithm
-- ============================================================
-- Score = base_engagement * creator_trust * content_boost * report_penalty * time_decay
--
-- Signals used:
--   1. Upvotes (like_count × 3)
--   2. Downvotes (dislike_count × -2)
--   3. Views (view_count × 1)
--   4. Comments (comment_count × 2)
--   5. Watch completion rate (0-5 bonus based on avg progress/duration)
--   8. Purchases (purchase_count × 10) — promotes content that sells
--   9. Tips (count × 8) — promotes content that earns tips
--  10. Recency (time decay with ~3 day half-life)
--  11. Video duration (used for completion rate calc)
--  12. Creator followers (log scale trust signal)
--  13. Creator subscribers (log scale trust signal)
--  14. Creator star level (0.1 per level multiplier)
--  15. Reports (penalty: -15% per report, min 10%)
--
-- Content type boosts:
--   Upcoming premiere: 2.0x (hot/event content)
--   Series episodes: 1.3x (bingeable)
--   Anime genre: 1.3x
--   Full movies: 1.2x
--   Meme/parody: 1.2x
--   Shorts: 1.1x (quick engagement)

-- Add trending_score column
ALTER TABLE videos ADD COLUMN IF NOT EXISTS trending_score float DEFAULT 0;

-- Index for fast sorting
CREATE INDEX IF NOT EXISTS idx_videos_trending_score ON videos (trending_score DESC)
  WHERE is_published = true;

-- Main scoring function
CREATE OR REPLACE FUNCTION recalculate_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE videos v SET trending_score = (
    -- ========== BASE ENGAGEMENT ==========
    GREATEST(0,
      COALESCE(v.view_count, 0) * 1.0
      + COALESCE(v.like_count, 0) * 3.0
      - COALESCE(v.dislike_count, 0) * 2.0
      + COALESCE(v.comment_count, 0) * 2.0
      + COALESCE(v.purchase_count, 0) * 10.0
      -- Tip count (each tip is a strong signal)
      + COALESCE(
          (SELECT COUNT(*) FROM tips t WHERE t.video_id = v.id),
          0
        ) * 8.0
      -- Bookmark/watchlist count
      + COALESCE(
          (SELECT COUNT(*) FROM watchlist w WHERE w.video_id = v.id),
          0
        ) * 2.0
      -- Completion rate bonus: avg(progress/duration) × 5
      -- Only counts if video has duration and at least 1 watch
      + COALESCE(
          (SELECT
            AVG(LEAST(wh.progress_seconds::float / GREATEST(wh.duration_seconds, 1), 1.0)) * 5.0
           FROM watch_history wh
           WHERE wh.video_id = v.id AND wh.duration_seconds > 0
          ),
          0
        )
    )

    -- ========== CREATOR TRUST MULTIPLIER ==========
    -- star_level bonus + log(followers) + log(subscribers)
    * COALESCE(
        (SELECT
          1.0
          + LEAST(COALESCE(p.star_level, 0), 3) * 0.1
          + LN(1 + COALESCE(p.follower_count, 0)) * 0.03
          + LN(1 + COALESCE(p.subscriber_count, 0)) * 0.06
         FROM profiles p WHERE p.id = v.creator_id
        ),
        1.0
      )

    -- ========== CONTENT TYPE BOOST ==========
    * CASE
        -- Upcoming/active premiere: hottest
        WHEN v.is_premiere = true AND v.premiere_ended = false
          THEN 2.0
        -- Series: bingeable, high retention
        WHEN v.content_type = 'series' OR v.content_type = 'episode'
          THEN 1.3
        -- Full movies
        WHEN v.content_type = 'movie'
          THEN 1.2
        -- Shorts: quick engagement
        WHEN v.content_type = 'short'
          THEN 1.1
        ELSE 1.0
      END
    * CASE
        -- Genre boosts (stacks with content type)
        WHEN v.genre::text = 'anime' THEN 1.3
        WHEN v.genre::text LIKE 'meme%' THEN 1.2
        ELSE 1.0
      END

    -- ========== REPORT PENALTY ==========
    -- Each report reduces score by 15%, minimum 10% of original
    * GREATEST(0.1,
        1.0 - COALESCE(
          (SELECT COUNT(*) * 0.15
           FROM content_reports cr
           WHERE cr.video_id = v.id),
          0
        )
      )

    -- ========== TIME DECAY ==========
    -- Score decays over time. ~3 day half-life.
    -- Formula: 1 / (1 + hours/72)^1.5
    * (1.0 / POWER(
        1.0 + EXTRACT(EPOCH FROM (
          NOW() - COALESCE(v.published_at, v.created_at)
        )) / (72.0 * 3600.0),
        1.5
      ))

  )
  WHERE v.is_published = true;

  -- Zero out unpublished videos
  UPDATE videos SET trending_score = 0 WHERE is_published = false;
END;
$$ LANGUAGE plpgsql;

-- Run initial calculation
SELECT recalculate_trending_scores();
