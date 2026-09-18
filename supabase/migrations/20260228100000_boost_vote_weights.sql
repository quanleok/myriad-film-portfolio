-- ============================================================
-- Boost upvote/downvote weights in trending algorithm
-- ============================================================
-- Previously: like_count × 3, dislike_count × -2
-- Now:        like_count × 6, dislike_count × -4
--
-- Votes are the primary community signal for content quality.
-- Doubling their weight gives the community more power to
-- surface good content and suppress low-quality content.

CREATE OR REPLACE FUNCTION recalculate_trending_scores()
RETURNS void AS $$
BEGIN
  UPDATE videos v SET trending_score = (
    -- ========== BASE ENGAGEMENT ==========
    GREATEST(0,
      COALESCE(v.view_count, 0) * 1.0
      + COALESCE(v.like_count, 0) * 6.0
      - COALESCE(v.dislike_count, 0) * 4.0
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
        WHEN v.is_premiere = true AND v.premiere_ended = false
          THEN 2.0
        WHEN v.content_type = 'series' OR v.content_type = 'episode'
          THEN 1.3
        WHEN v.content_type = 'movie'
          THEN 1.2
        WHEN v.content_type = 'short'
          THEN 1.1
        ELSE 1.0
      END
    * CASE
        WHEN v.genre::text = 'anime' THEN 1.3
        WHEN v.genre::text LIKE 'meme%' THEN 1.2
        ELSE 1.0
      END

    -- ========== REPORT PENALTY ==========
    * GREATEST(0.1,
        1.0 - COALESCE(
          (SELECT COUNT(*) * 0.15
           FROM content_reports cr
           WHERE cr.video_id = v.id),
          0
        )
      )

    -- ========== TIME DECAY ==========
    * (1.0 / POWER(
        1.0 + EXTRACT(EPOCH FROM (
          NOW() - COALESCE(v.published_at, v.created_at)
        )) / (72.0 * 3600.0),
        1.5
      ))

  )
  WHERE v.is_published = true;

  UPDATE videos SET trending_score = 0 WHERE is_published = false;
END;
$$ LANGUAGE plpgsql;

-- Recalculate with new weights
SELECT recalculate_trending_scores();
