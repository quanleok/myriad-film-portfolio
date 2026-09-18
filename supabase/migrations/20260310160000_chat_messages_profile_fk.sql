-- Add direct FK from chat_messages.user_id to profiles.id
-- so PostgREST can join chat_messages → profiles
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_profile_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id);
