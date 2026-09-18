-- Prevent duplicate reports: same user can only report the same video or comment once
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique_video
  ON content_reports (reporter_id, video_id)
  WHERE video_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique_comment
  ON content_reports (reporter_id, comment_id)
  WHERE comment_id IS NOT NULL;
