-- Premiere chat messages (real-time)
CREATE TABLE IF NOT EXISTS premiere_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL CHECK (char_length(message) <= 500),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_premiere_chats_video
  ON premiere_chats(video_id, created_at);

ALTER TABLE premiere_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read premiere chats"
  ON premiere_chats FOR SELECT USING (true);

CREATE POLICY "Logged in users can post"
  ON premiere_chats FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Supabase Realtime on premiere_chats
ALTER PUBLICATION supabase_realtime ADD TABLE premiere_chats;

-- Add premiere fields to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_premiere boolean NOT NULL DEFAULT false;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS premiere_at timestamptz;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS premiere_ended boolean NOT NULL DEFAULT false;

-- Index for finding upcoming premieres efficiently
CREATE INDEX IF NOT EXISTS idx_videos_premiere
  ON videos(is_premiere, premiere_ended, premiere_at)
  WHERE is_premiere = true;
