-- Chat rooms (admin-defined)
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  reply_to_id UUID REFERENCES chat_messages(id),
  image_url TEXT,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emoji reactions
CREATE TABLE chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  emoji TEXT NOT NULL CHECK (char_length(emoji) <= 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- @mentions for notifications
CREATE TABLE chat_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_reactions_message ON chat_reactions(message_id);
CREATE INDEX idx_chat_mentions_user ON chat_mentions(mentioned_user_id, created_at DESC);

-- RLS policies
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mentions ENABLE ROW LEVEL SECURITY;

-- Rooms: anyone can read
CREATE POLICY "chat_rooms_select" ON chat_rooms FOR SELECT USING (true);

-- Messages: anyone can read, authenticated can insert own, update/delete own
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Reactions: anyone can read, authenticated can insert/delete own
CREATE POLICY "chat_reactions_select" ON chat_reactions FOR SELECT USING (true);
CREATE POLICY "chat_reactions_insert" ON chat_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_reactions_delete" ON chat_reactions FOR DELETE USING (auth.uid() = user_id);

-- Mentions: anyone can read, authenticated can insert
CREATE POLICY "chat_mentions_select" ON chat_mentions FOR SELECT USING (true);
CREATE POLICY "chat_mentions_insert" ON chat_mentions FOR INSERT WITH CHECK (true);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;

-- Seed the 6 rooms
INSERT INTO chat_rooms (slug, name, description, sort_order) VALUES
  ('general', 'General', 'Casual chat, anything goes', 1),
  ('show-your-work', 'Show Your Work', 'Share what you''re making', 2),
  ('tools-and-tips', 'Tools & Tips', 'Sora, Kling, Seedance workflows', 3),
  ('collabs', 'Collabs', 'Find collaborators', 4),
  ('feedback', 'Feedback', 'Get eyes on your WIP', 5),
  ('off-topic', 'Off Topic', 'Non-AI stuff', 6);
