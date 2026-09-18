-- Add progress tracking columns to watch_history
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS progress_seconds int DEFAULT 0;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS duration_seconds int DEFAULT 0;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

-- Backfill: set progress_seconds from existing last_position_seconds
UPDATE watch_history SET progress_seconds = last_position_seconds WHERE progress_seconds = 0 AND last_position_seconds > 0;
