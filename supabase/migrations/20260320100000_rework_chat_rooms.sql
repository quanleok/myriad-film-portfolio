-- Rework chat rooms: trim to Announcements, General, Support, Show Your Work
-- Delete messages in rooms being removed first (FK constraint)
DELETE FROM chat_mentions WHERE message_id IN (
  SELECT id FROM chat_messages WHERE room_id IN (
    SELECT id FROM chat_rooms WHERE slug IN ('tools-tips', 'collabs', 'feedback', 'off-topic')
  )
);
DELETE FROM chat_reactions WHERE message_id IN (
  SELECT id FROM chat_messages WHERE room_id IN (
    SELECT id FROM chat_rooms WHERE slug IN ('tools-tips', 'collabs', 'feedback', 'off-topic')
  )
);
DELETE FROM chat_messages WHERE room_id IN (
  SELECT id FROM chat_rooms WHERE slug IN ('tools-tips', 'collabs', 'feedback', 'off-topic')
);
DELETE FROM chat_rooms WHERE slug IN ('tools-tips', 'collabs', 'feedback', 'off-topic');

-- Add Support room
INSERT INTO chat_rooms (id, slug, name, description, sort_order, admin_only)
VALUES (
  gen_random_uuid(),
  'support',
  'Support',
  'Questions, bug reports, and help from the Myriad team',
  2,
  false
)
ON CONFLICT (slug) DO NOTHING;

-- Reorder remaining rooms
UPDATE chat_rooms SET sort_order = 0 WHERE slug = 'announcements';
UPDATE chat_rooms SET sort_order = 1 WHERE slug = 'general';
UPDATE chat_rooms SET sort_order = 2 WHERE slug = 'support';
UPDATE chat_rooms SET sort_order = 3 WHERE slug = 'show-your-work';
