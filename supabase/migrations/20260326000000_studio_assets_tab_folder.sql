-- Add tab and folder_path columns to studio_assets for the folder-based asset tabs
-- (Characters, Locations, Props)

alter table public.studio_assets
  add column if not exists tab text check (tab in ('character', 'location', 'prop')),
  add column if not exists folder_path text not null default '';

-- Index for querying assets by tab + folder
create index if not exists idx_studio_assets_tab_folder
  on public.studio_assets (project_id, tab, folder_path);
