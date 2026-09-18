-- Add teaser as a first-class project state.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'teaser'
      AND enumtypid = 'project_lifecycle_status'::regtype
  ) THEN
    ALTER TYPE project_lifecycle_status ADD VALUE 'teaser' AFTER 'draft';
  END IF;
END $$;

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_launch_mode_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_launch_mode_check
  CHECK (launch_mode IN ('teaser', 'preorder', 'production', 'direct_premiere', 'direct_release'));
