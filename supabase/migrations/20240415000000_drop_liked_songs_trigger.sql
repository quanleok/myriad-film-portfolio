-- Remove the auto-sync trigger that copied music likes into a "Liked Songs" playlist.
-- Likes are now unified: one like system for all content types.

DROP TRIGGER IF EXISTS trg_sync_liked_songs_playlist ON public.likes;
DROP FUNCTION IF EXISTS public.sync_liked_songs_playlist();
