ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS genre_interests text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS creator_onboarding_completed boolean NOT NULL DEFAULT false;
