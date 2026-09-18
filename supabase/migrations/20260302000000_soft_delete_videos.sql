-- Soft-delete + purchase count for videos
-- Allows creators to "delete" videos without breaking access for existing purchasers.

-- Add soft-delete timestamp
ALTER TABLE videos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add cached purchase count for creator UI warnings
ALTER TABLE videos ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;

-- Backfill purchase_count from existing purchases
UPDATE videos v SET purchase_count = COALESCE((
  SELECT COUNT(*)::integer FROM purchases p
  WHERE p.video_id = v.id AND p.payment_status = 'completed'
), 0);

-- Exclude soft-deleted videos from browse/search (published check already exists, this is defense-in-depth)
CREATE INDEX IF NOT EXISTS idx_videos_deleted_at ON videos (deleted_at) WHERE deleted_at IS NULL;
