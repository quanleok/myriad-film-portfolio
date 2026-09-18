-- Playlist glue updates for team integration.
-- Safe to run on environments where playlist premium columns may already exist.

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents integer,
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_playlists_creator_id
  ON public.playlists(creator_id);

CREATE TABLE IF NOT EXISTS public.playlist_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  creator_earnings_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text NOT NULL DEFAULT '',
  payment_status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(viewer_id, playlist_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_purchases_viewer_id
  ON public.playlist_purchases(viewer_id);
CREATE INDEX IF NOT EXISTS idx_playlist_purchases_playlist_id
  ON public.playlist_purchases(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_purchases_creator_id
  ON public.playlist_purchases(creator_id);

ALTER TABLE public.playlist_purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'playlist_purchases'
      AND policyname = 'Viewers and creators can view playlist purchases'
  ) THEN
    CREATE POLICY "Viewers and creators can view playlist purchases"
      ON public.playlist_purchases
      FOR SELECT
      USING (auth.uid() = viewer_id OR auth.uid() = creator_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'playlist_purchases'
      AND policyname = 'Viewers can insert their playlist purchases'
  ) THEN
    CREATE POLICY "Viewers can insert their playlist purchases"
      ON public.playlist_purchases
      FOR INSERT
      WITH CHECK (auth.uid() = viewer_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.sync_liked_songs_playlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_playlist_id uuid;
  v_is_music boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT (content_type = 'music_video') INTO v_is_music
    FROM public.videos
    WHERE id = NEW.video_id;

    IF COALESCE(v_is_music, false) = false THEN
      RETURN NEW;
    END IF;

    SELECT id
    INTO v_playlist_id
    FROM public.playlists
    WHERE user_id = NEW.user_id
      AND title = 'Liked Songs'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_playlist_id IS NULL THEN
      INSERT INTO public.playlists (
        user_id,
        title,
        description,
        is_public,
        is_premium
      )
      VALUES (
        NEW.user_id,
        'Liked Songs',
        'Auto-synced from liked music tracks.',
        false,
        false
      )
      RETURNING id INTO v_playlist_id;
    END IF;

    INSERT INTO public.playlist_items (playlist_id, video_id, position)
    VALUES (
      v_playlist_id,
      NEW.video_id,
      COALESCE(
        (
          SELECT MAX(position) + 1
          FROM public.playlist_items
          WHERE playlist_id = v_playlist_id
        ),
        1
      )
    )
    ON CONFLICT (playlist_id, video_id) DO NOTHING;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT (content_type = 'music_video') INTO v_is_music
    FROM public.videos
    WHERE id = OLD.video_id;

    IF COALESCE(v_is_music, false) = false THEN
      RETURN OLD;
    END IF;

    SELECT id
    INTO v_playlist_id
    FROM public.playlists
    WHERE user_id = OLD.user_id
      AND title = 'Liked Songs'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_playlist_id IS NOT NULL THEN
      DELETE FROM public.playlist_items
      WHERE playlist_id = v_playlist_id
        AND video_id = OLD.video_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_liked_songs_playlist ON public.likes;
CREATE TRIGGER trg_sync_liked_songs_playlist
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_liked_songs_playlist();
