ALTER TABLE project_character_cards ADD COLUMN IF NOT EXISTS video_asset_id text;
ALTER TABLE project_concept_cards ADD COLUMN IF NOT EXISTS video_asset_id text;
