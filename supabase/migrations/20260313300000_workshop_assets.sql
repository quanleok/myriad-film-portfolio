-- Workshop assets table for reusable media across blocks
CREATE TABLE IF NOT EXISTS workshop_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES workshop_projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL DEFAULT '',
  caption TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_kind TEXT NOT NULL DEFAULT 'supabase_image' CHECK (storage_kind IN ('supabase_image', 'bunny_video', 'external_url')),
  url TEXT,
  asset_id TEXT,
  status TEXT DEFAULT 'rough' CHECK (status IN ('rough', 'candidate', 'approved', 'final')),
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workshop_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access workshop assets"
  ON workshop_assets FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_workshop_assets_project ON workshop_assets (project_id);
CREATE INDEX idx_workshop_assets_owner ON workshop_assets (owner_id);
