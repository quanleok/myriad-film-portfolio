-- Project collaborators: private project access + optional earnings visibility

CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invite_status TEXT NOT NULL DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'declined', 'revoked')),
  can_view_earnings BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS team_split_locked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project
  ON project_collaborators(project_id);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_user
  ON project_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_status
  ON project_collaborators(project_id, invite_status);

ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own project collaborator rows" ON project_collaborators;
CREATE POLICY "Read own project collaborator rows"
  ON project_collaborators FOR SELECT
  USING (
    user_id = auth.uid()
    OR project_id IN (SELECT id FROM projects WHERE creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner inserts project collaborators" ON project_collaborators;
CREATE POLICY "Owner inserts project collaborators"
  ON project_collaborators FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner updates project collaborators" ON project_collaborators;
CREATE POLICY "Owner updates project collaborators"
  ON project_collaborators FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner deletes project collaborators" ON project_collaborators;
CREATE POLICY "Owner deletes project collaborators"
  ON project_collaborators FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role full access project collaborators" ON project_collaborators;
CREATE POLICY "Service role full access project collaborators"
  ON project_collaborators FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO project_collaborators (
  project_id,
  user_id,
  invited_by,
  role,
  invite_status,
  can_view_earnings,
  accepted_at,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.creator_id,
  p.creator_id,
  'owner',
  'accepted',
  true,
  COALESCE(p.created_at, now()),
  COALESCE(p.created_at, now()),
  now()
FROM projects p
ON CONFLICT (project_id, user_id) DO UPDATE
SET
  role = 'owner',
  invite_status = 'accepted',
  can_view_earnings = true,
  accepted_at = COALESCE(project_collaborators.accepted_at, EXCLUDED.accepted_at),
  revoked_at = NULL,
  updated_at = now();
