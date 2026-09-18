-- ============================================================
-- Launch Modes: direct_premiere + direct_release
-- ============================================================

ALTER TABLE projects
  ADD COLUMN launch_mode TEXT NOT NULL DEFAULT 'preorder'
  CHECK (launch_mode IN ('preorder', 'direct_premiere', 'direct_release'));

-- Index for filtering by launch mode
CREATE INDEX idx_projects_launch_mode ON projects(launch_mode);
