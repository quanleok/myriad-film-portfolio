-- Add is_pinned column to project_updates for pin-to-top functionality
ALTER TABLE project_updates
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Allow creators to update their own updates (for pin toggle)
DO $$ BEGIN
  CREATE POLICY "Creators can update own updates" ON project_updates
    FOR UPDATE USING (creator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
