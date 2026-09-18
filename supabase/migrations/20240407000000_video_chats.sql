-- Always-on video chat messages (real-time)
CREATE TABLE IF NOT EXISTS video_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL CHECK (char_length(message) <= 500),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_chats_video
  ON video_chats(video_id, created_at);

ALTER TABLE video_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read video chats"
  ON video_chats FOR SELECT USING (true);

CREATE POLICY "Logged in users can chat"
  ON video_chats FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Supabase Realtime on video_chats
ALTER PUBLICATION supabase_realtime ADD TABLE video_chats;
