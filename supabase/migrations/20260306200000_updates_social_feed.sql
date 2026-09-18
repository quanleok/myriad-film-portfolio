ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS like_count_cache integer DEFAULT 0;
ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS comment_count_cache integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS project_update_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES project_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_update_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES project_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 1000),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_update_likes_update_id ON project_update_likes(update_id);
CREATE INDEX IF NOT EXISTS idx_update_likes_user_id ON project_update_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_update_comments_update_id ON project_update_comments(update_id);

ALTER TABLE project_update_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_update_comments ENABLE ROW LEVEL SECURITY;
