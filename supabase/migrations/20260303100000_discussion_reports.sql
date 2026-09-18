-- Add discussion post reporting to content_reports table
ALTER TABLE content_reports
  ADD COLUMN IF NOT EXISTS discussion_post_id uuid REFERENCES project_discussion_posts(id) ON DELETE CASCADE;

-- Drop old CHECK constraint and add updated one
ALTER TABLE content_reports DROP CONSTRAINT IF EXISTS content_reports_check;
ALTER TABLE content_reports ADD CONSTRAINT content_reports_check
  CHECK (video_id IS NOT NULL OR comment_id IS NOT NULL OR discussion_post_id IS NOT NULL);

-- Unique index for discussion post report dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique_discussion
  ON content_reports (reporter_id, discussion_post_id)
  WHERE discussion_post_id IS NOT NULL;
