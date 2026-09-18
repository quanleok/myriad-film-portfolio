-- 1a. Add media_type to videos (text + CHECK, avoids enum pain)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'video'
  CHECK (media_type IN ('video', 'music', 'course_lesson'));

-- Backfill existing rows
UPDATE videos SET media_type = 'music' WHERE content_type = 'music_video';
-- course_lesson backfill deferred to 20240412 migration (requires series_type column)

CREATE INDEX IF NOT EXISTS idx_videos_media_type ON videos(media_type);

-- 1b. Music columns on videos
ALTER TABLE videos ADD COLUMN IF NOT EXISTS album_art_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mood_tags text[] DEFAULT '{}';

-- 1c. Course lesson columns on videos
ALTER TABLE videos ADD COLUMN IF NOT EXISTS lesson_notes text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS lesson_resources jsonb DEFAULT '[]';

-- 1d. course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  is_completed boolean NOT NULL DEFAULT false,
  last_lesson_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- User manages own enrollments
CREATE POLICY "Users manage own enrollments"
  ON course_enrollments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Creator can view enrollments for their courses
CREATE POLICY "Creators view enrollments for own courses"
  ON course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = course_enrollments.course_id
        AND series.creator_id = auth.uid()
    )
  );

-- 1e. lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- User manages own lesson progress
CREATE POLICY "Users manage own lesson progress"
  ON lesson_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Creator can view lesson progress for their courses
CREATE POLICY "Creators view lesson progress for own courses"
  ON lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = lesson_progress.course_id
        AND series.creator_id = auth.uid()
    )
  );

-- 1f. Triggers — reuse existing update_updated_at()
CREATE TRIGGER set_course_enrollments_updated_at
  BEFORE UPDATE ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
