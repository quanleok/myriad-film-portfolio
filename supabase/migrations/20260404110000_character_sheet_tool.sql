create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  ref_image_url text,
  thumbnail_url text,
  description_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_outputs (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('fullbody', 'sheet', 'description', 'expression', 'closeup', 'palette')),
  image_url text,
  metadata_json jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_characters_user on public.characters(user_id);
create index if not exists idx_character_outputs_character on public.character_outputs(character_id);
create index if not exists idx_character_outputs_user on public.character_outputs(user_id);

alter table public.characters enable row level security;
alter table public.character_outputs enable row level security;

drop policy if exists "characters_select_own" on public.characters;
create policy "characters_select_own"
  on public.characters
  for select
  using (user_id = auth.uid());

drop policy if exists "characters_insert_own" on public.characters;
create policy "characters_insert_own"
  on public.characters
  for insert
  with check (user_id = auth.uid());

drop policy if exists "characters_update_own" on public.characters;
create policy "characters_update_own"
  on public.characters
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "characters_delete_own" on public.characters;
create policy "characters_delete_own"
  on public.characters
  for delete
  using (user_id = auth.uid());

drop policy if exists "character_outputs_select_own" on public.character_outputs;
create policy "character_outputs_select_own"
  on public.character_outputs
  for select
  using (user_id = auth.uid());

drop policy if exists "character_outputs_insert_own" on public.character_outputs;
create policy "character_outputs_insert_own"
  on public.character_outputs
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.characters
      where characters.id = character_id
        and characters.user_id = auth.uid()
    )
  );

drop policy if exists "character_outputs_update_own" on public.character_outputs;
create policy "character_outputs_update_own"
  on public.character_outputs
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.characters
      where characters.id = character_id
        and characters.user_id = auth.uid()
    )
  );

drop policy if exists "character_outputs_delete_own" on public.character_outputs;
create policy "character_outputs_delete_own"
  on public.character_outputs
  for delete
  using (user_id = auth.uid());

drop trigger if exists set_characters_updated_at on public.characters;
create trigger set_characters_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();
