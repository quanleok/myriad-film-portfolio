-- Workshop tables for collaborative production organizer

-- Projects
CREATE TABLE IF NOT EXISTS workshop_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_image_url TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Collaborators
CREATE TABLE IF NOT EXISTS workshop_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES workshop_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Blocks
CREATE TABLE IF NOT EXISTS workshop_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES workshop_projects(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('script', 'character', 'scene', 'note')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE workshop_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_blocks ENABLE ROW LEVEL SECURITY;

-- Workshop projects: public projects readable by all, private by owner + collaborators
CREATE POLICY "Public read public workshop projects"
  ON workshop_projects FOR SELECT
  USING (
    visibility = 'public'
    OR owner_id = auth.uid()
    OR id IN (SELECT project_id FROM workshop_collaborators WHERE user_id = auth.uid())
  );

CREATE POLICY "Owner insert workshop projects"
  ON workshop_projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner update workshop projects"
  ON workshop_projects FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owner delete workshop projects"
  ON workshop_projects FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Service role full access workshop projects"
  ON workshop_projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Workshop blocks: readable if project is accessible, writable by owner + editors
CREATE POLICY "Read workshop blocks"
  ON workshop_blocks FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM workshop_projects
      WHERE visibility = 'public'
        OR owner_id = auth.uid()
        OR id IN (SELECT project_id FROM workshop_collaborators WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Owner and editors insert workshop blocks"
  ON workshop_blocks FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM workshop_projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM workshop_collaborators WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

CREATE POLICY "Owner and editors update workshop blocks"
  ON workshop_blocks FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM workshop_projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM workshop_collaborators WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

CREATE POLICY "Owner and editors delete workshop blocks"
  ON workshop_blocks FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM workshop_projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM workshop_collaborators WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

CREATE POLICY "Service role full access workshop blocks"
  ON workshop_blocks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Workshop collaborators: owner manages, collaborators can read own rows
CREATE POLICY "Read own collaborator rows"
  ON workshop_collaborators FOR SELECT
  USING (
    user_id = auth.uid()
    OR project_id IN (SELECT id FROM workshop_projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owner manages collaborators"
  ON workshop_collaborators FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM workshop_projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owner update collaborators"
  ON workshop_collaborators FOR UPDATE
  USING (
    project_id IN (SELECT id FROM workshop_projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owner delete collaborators"
  ON workshop_collaborators FOR DELETE
  USING (
    project_id IN (SELECT id FROM workshop_projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Service role full access workshop collaborators"
  ON workshop_collaborators FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_workshop_projects_owner ON workshop_projects (owner_id);
CREATE INDEX idx_workshop_projects_visibility ON workshop_projects (visibility) WHERE visibility = 'public';
CREATE INDEX idx_workshop_blocks_project ON workshop_blocks (project_id, sort_order);
CREATE INDEX idx_workshop_collaborators_project ON workshop_collaborators (project_id);
CREATE INDEX idx_workshop_collaborators_user ON workshop_collaborators (user_id);
