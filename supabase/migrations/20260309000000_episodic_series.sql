-- Add episode_count to projects (nullable, only set for series)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS episode_count integer;
ALTER TABLE projects ADD CONSTRAINT projects_episode_count_range
  CHECK (episode_count IS NULL OR (episode_count >= 2 AND episode_count <= 50));

-- Create project_episodes table
CREATE TABLE IF NOT EXISTS project_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  premiere_scheduled_at timestamptz,
  premiere_ended boolean NOT NULL DEFAULT false,
  is_premiere_live boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, episode_number)
);

-- RLS policies
ALTER TABLE project_episodes ENABLE ROW LEVEL SECURITY;

-- Anyone can read episodes of live projects
CREATE POLICY "Episodes readable by all"
  ON project_episodes FOR SELECT
  USING (true);

-- Only project creator can insert/update/delete
CREATE POLICY "Creator can manage episodes"
  ON project_episodes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_episodes.project_id
      AND projects.creator_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_project_episodes_project_id ON project_episodes(project_id, episode_number);
