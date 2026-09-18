-- Script System Overhaul: story core, beats, focus rooms, proposed changes

-- ============================================================
-- New Tables
-- ============================================================

-- Story Core: one row per project, holds the high-level story concept
create table if not exists public.studio_story_core (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.studio_projects(id) on delete cascade,
  premise text not null default '',
  theme text not null default '',
  tone text not null default '',
  setting text not null default '',
  time_period text not null default '',
  world_rules jsonb not null default '[]'::jsonb,
  synopsis text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Beats: structural story beats (inciting incident, climax, etc.)
create table if not exists public.studio_beats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  act text not null default '' check (act in ('', 'act_1', 'act_2a', 'act_2b', 'act_3')),
  beat_type text not null default 'custom' check (beat_type in ('opening', 'inciting_incident', 'first_turn', 'midpoint', 'second_turn', 'climax', 'resolution', 'custom')),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved')),
  linked_scene_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Focus Rooms: scoped AI workroom for one object
create table if not exists public.studio_focus_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  room_type text not null check (room_type in ('character', 'beat', 'scene', 'dialogue')),
  target_type text not null check (target_type in ('entity', 'beat', 'scene', 'script_excerpt')),
  target_id uuid,
  title text not null,
  canon_snapshot jsonb not null default '{}'::jsonb,
  locked_facts jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Room Messages: chat messages within a focus room
create table if not exists public.studio_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.studio_focus_rooms(id) on delete cascade,
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Proposed Changes: changes from a room pending acceptance
create table if not exists public.studio_proposed_changes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.studio_focus_rooms(id) on delete cascade,
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  target_type text not null check (target_type in ('entity', 'beat', 'scene', 'script_excerpt', 'story_core')),
  target_id uuid,
  change_type text not null check (change_type in ('update', 'create', 'delete')),
  field_name text not null default '',
  old_value jsonb,
  new_value jsonb not null,
  summary text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Add relationship fields to existing entities table
-- ============================================================

alter table public.studio_entities
  add column if not exists backstory text not null default '',
  add column if not exists motivation text not null default '',
  add column if not exists arc text not null default '',
  add column if not exists relationships jsonb not null default '[]'::jsonb,
  add column if not exists visual_description text not null default '';

-- ============================================================
-- Add dialogue_blocks to scenes for Dialogue Room targets
-- ============================================================

alter table public.studio_scenes
  add column if not exists dialogue_blocks jsonb not null default '[]'::jsonb;

-- ============================================================
-- Triggers
-- ============================================================

create trigger set_studio_story_core_updated_at
  before update on public.studio_story_core
  for each row execute function public.set_updated_at();

create trigger set_studio_beats_updated_at
  before update on public.studio_beats
  for each row execute function public.set_updated_at();

create trigger set_studio_focus_rooms_updated_at
  before update on public.studio_focus_rooms
  for each row execute function public.set_updated_at();

-- ============================================================
-- Enable RLS
-- ============================================================

alter table public.studio_story_core enable row level security;
alter table public.studio_beats enable row level security;
alter table public.studio_focus_rooms enable row level security;
alter table public.studio_room_messages enable row level security;
alter table public.studio_proposed_changes enable row level security;

-- ============================================================
-- RLS Policies (permissive — auth checked in API routes, admin client used)
-- ============================================================

create policy "studio_story_core_all" on public.studio_story_core for all using (true) with check (true);
create policy "studio_beats_all" on public.studio_beats for all using (true) with check (true);
create policy "studio_focus_rooms_all" on public.studio_focus_rooms for all using (true) with check (true);
create policy "studio_room_messages_all" on public.studio_room_messages for all using (true) with check (true);
create policy "studio_proposed_changes_all" on public.studio_proposed_changes for all using (true) with check (true);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_studio_story_core_project on public.studio_story_core (project_id);
create index if not exists idx_studio_beats_project on public.studio_beats (project_id);
create index if not exists idx_studio_beats_sort on public.studio_beats (project_id, sort_order);
create index if not exists idx_studio_focus_rooms_project on public.studio_focus_rooms (project_id);
create index if not exists idx_studio_focus_rooms_target on public.studio_focus_rooms (target_type, target_id);
create index if not exists idx_studio_room_messages_room on public.studio_room_messages (room_id, created_at);
create index if not exists idx_studio_proposed_changes_room on public.studio_proposed_changes (room_id);
create index if not exists idx_studio_proposed_changes_status on public.studio_proposed_changes (project_id, status);
