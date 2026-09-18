ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_launch_mode_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_launch_mode_check
  CHECK (launch_mode IN ('preorder', 'production', 'direct_premiere', 'direct_release'));
