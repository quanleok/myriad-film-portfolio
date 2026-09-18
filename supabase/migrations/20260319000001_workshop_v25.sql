ALTER TABLE workshop_projects
  ADD COLUMN IF NOT EXISTS allow_share_downloads BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE workshop_assets
  ADD COLUMN IF NOT EXISTS asset_category TEXT NOT NULL DEFAULT 'mixed' CHECK (asset_category IN ('generated_video', 'reference_image', 'location', 'character_sheet', 'mixed')),
  ADD COLUMN IF NOT EXISTS linked_scene_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_character_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS generation_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_workshop_assets_category ON workshop_assets (project_id, asset_category);
CREATE INDEX IF NOT EXISTS idx_workshop_assets_sort_order ON workshop_assets (project_id, sort_order);
