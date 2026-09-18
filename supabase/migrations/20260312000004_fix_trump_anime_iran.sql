-- Fix: Trump anime video is about Iran, not Venezuela
UPDATE blog_posts
SET
  title = 'AI Anime Is Getting Wild — From Trump in Iran to Cat vs Bruce Lee',
  body = REPLACE(body, 'Venezuela', 'Iran'),
  media = jsonb_set(
    media,
    '{0,caption}',
    '"AI anime: Trump in Iran — pushing the boundaries of AI animation"'
  ),
  updated_at = now()
WHERE title LIKE '%Trump in Venezuela%';
