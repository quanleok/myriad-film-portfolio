ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_rating text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS source_short_id uuid REFERENCES public.videos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_videos_project_id ON public.videos(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_shorts_feed ON public.videos(content_type, is_published, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_source_short_id ON public.projects(source_short_id)
  WHERE source_short_id IS NOT NULL;
