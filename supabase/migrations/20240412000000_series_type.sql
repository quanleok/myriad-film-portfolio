-- Add series_type to distinguish regular series from courses
ALTER TABLE series ADD COLUMN IF NOT EXISTS series_type text NOT NULL DEFAULT 'series'
  CHECK (series_type IN ('series', 'course'));

CREATE INDEX IF NOT EXISTS idx_series_series_type ON series(series_type);

-- Backfill course_lesson media_type (deferred from 20240410 migration)
UPDATE videos SET media_type = 'course_lesson' WHERE content_type = 'episode'
  AND series_id IN (SELECT id FROM series WHERE series_type = 'course');
