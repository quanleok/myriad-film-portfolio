-- ============================================================
-- Viewer Presence + Creator Activity
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

UPDATE public.profiles
SET last_active_at = now()
WHERE last_active_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at
  ON public.profiles(last_active_at DESC);
