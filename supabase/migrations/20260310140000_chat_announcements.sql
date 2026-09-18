-- Add admin_only flag to chat_rooms
ALTER TABLE chat_rooms ADD COLUMN admin_only BOOLEAN NOT NULL DEFAULT false;

-- Insert Announcements room at sort_order 0 (top of list)
INSERT INTO chat_rooms (slug, name, description, sort_order, admin_only) VALUES
  ('announcements', 'Announcements', 'Official updates from the Myriad team', 0, true);
