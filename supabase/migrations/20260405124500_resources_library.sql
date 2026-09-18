create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (
    category in (
      'character_pack',
      'prompt_template',
      'style_preset',
      'location_pack',
      'sound',
      'workflow',
      'prop_pack'
    )
  ),
  tags text[] not null default '{}',
  thumbnail_url text,
  download_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  license text not null default 'free' check (license in ('free', 'attribution', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text,
  file_size_bytes integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_likes (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(resource_id, user_id)
);

create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_resources_category on public.resources(category);
create index if not exists idx_resources_user on public.resources(user_id);
create index if not exists idx_resources_tags on public.resources using gin(tags);
create index if not exists idx_resource_files_resource on public.resource_files(resource_id);
create index if not exists idx_resource_comments_resource on public.resource_comments(resource_id);
create index if not exists idx_resource_likes_resource on public.resource_likes(resource_id);

create or replace function public.set_resources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
before update on public.resources
for each row
execute function public.set_resources_updated_at();

alter table public.resources enable row level security;
alter table public.resource_files enable row level security;
alter table public.resource_likes enable row level security;
alter table public.resource_comments enable row level security;

drop policy if exists "Public can view published resources" on public.resources;
create policy "Public can view published resources"
on public.resources
for select
using (is_published = true or auth.uid() = user_id);

drop policy if exists "Authenticated users can create resources" on public.resources;
create policy "Authenticated users can create resources"
on public.resources
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own resources" on public.resources;
create policy "Users can update own resources"
on public.resources
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resources" on public.resources;
create policy "Users can delete own resources"
on public.resources
for delete
using (auth.uid() = user_id);

drop policy if exists "Public can view resource files" on public.resource_files;
create policy "Public can view resource files"
on public.resource_files
for select
using (
  exists (
    select 1 from public.resources
    where resources.id = resource_files.resource_id
      and (resources.is_published = true or resources.user_id = auth.uid())
  )
);

drop policy if exists "Owners can manage resource files" on public.resource_files;
create policy "Owners can manage resource files"
on public.resource_files
for all
using (
  exists (
    select 1 from public.resources
    where resources.id = resource_files.resource_id
      and resources.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.resources
    where resources.id = resource_files.resource_id
      and resources.user_id = auth.uid()
  )
);

drop policy if exists "Public can view resource likes" on public.resource_likes;
create policy "Public can view resource likes"
on public.resource_likes
for select
using (
  exists (
    select 1 from public.resources
    where resources.id = resource_likes.resource_id
      and resources.is_published = true
  )
);

drop policy if exists "Users can manage own resource likes" on public.resource_likes;
create policy "Users can manage own resource likes"
on public.resource_likes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can view resource comments" on public.resource_comments;
create policy "Public can view resource comments"
on public.resource_comments
for select
using (
  exists (
    select 1 from public.resources
    where resources.id = resource_comments.resource_id
      and resources.is_published = true
  )
);

drop policy if exists "Users can create resource comments" on public.resource_comments;
create policy "Users can create resource comments"
on public.resource_comments
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resource comments" on public.resource_comments;
create policy "Users can delete own resource comments"
on public.resource_comments
for delete
using (auth.uid() = user_id);
