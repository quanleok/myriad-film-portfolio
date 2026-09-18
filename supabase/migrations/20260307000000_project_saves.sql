-- project_saves: lower-friction "save/bookmark" action before preorder
CREATE TABLE IF NOT EXISTS project_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- RLS
ALTER TABLE project_saves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own saves' AND tablename = 'project_saves') THEN
    CREATE POLICY "Users can insert own saves" ON project_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own saves' AND tablename = 'project_saves') THEN
    CREATE POLICY "Users can delete own saves" ON project_saves FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own saves' AND tablename = 'project_saves') THEN
    CREATE POLICY "Users can select own saves" ON project_saves FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_project_saves_user ON project_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_project_saves_project ON project_saves(project_id);
