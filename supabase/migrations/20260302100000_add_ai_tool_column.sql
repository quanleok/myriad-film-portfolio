-- Add ai_tool column to videos table for tracking which AI tool was used
ALTER TABLE videos ADD COLUMN IF NOT EXISTS ai_tool TEXT DEFAULT NULL;

-- Index for filtering by ai_tool (used by /seedance page)
CREATE INDEX IF NOT EXISTS idx_videos_ai_tool ON videos (ai_tool) WHERE ai_tool IS NOT NULL;
