ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'short';

ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS preview_duration_seconds integer;

CREATE INDEX IF NOT EXISTS idx_videos_is_premium
ON public.videos (is_premium)
WHERE is_published = true;

UPDATE public.videos
SET is_premium = (
  pricing_model <> 'free'
  OR COALESCE(price_cents, 0) > 0
);

UPDATE public.videos
SET preview_duration_seconds =
  CASE
    WHEN is_premium THEN COALESCE(preview_seconds, 10)
    ELSE NULL
  END
WHERE preview_duration_seconds IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'videos_preview_duration_seconds_check'
  ) THEN
    ALTER TABLE public.videos
    ADD CONSTRAINT videos_preview_duration_seconds_check
    CHECK (
      preview_duration_seconds IS NULL
      OR preview_duration_seconds BETWEEN 5 AND 60
    );
  END IF;
END
$$;
