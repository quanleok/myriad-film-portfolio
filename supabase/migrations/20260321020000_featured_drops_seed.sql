-- Add external teaser support for curated teaser pages
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS external_teaser_url text;

-- Portfolio copy: private curation account and content seed data omitted.
-- The external teaser schema change above is retained.
