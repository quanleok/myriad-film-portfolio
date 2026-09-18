alter table public.videos
  add column if not exists story_elements jsonb;

comment on column public.videos.story_elements is
  'Optional structured story metadata for Watch uploads, including characters, locations, and props.';
