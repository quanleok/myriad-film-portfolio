drop table if exists public.tutorial_purchases;

create table if not exists public.tutorials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  body_markdown text not null,
  cover_image_url text,
  category text not null default 'general',
  tags text[] not null default '{}'::text[],
  difficulty text not null default 'beginner',
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tutorials'
      and column_name = 'creator_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tutorials'
      and column_name = 'user_id'
  ) then
    alter table public.tutorials rename column creator_id to user_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tutorials'
      and column_name = 'body'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tutorials'
      and column_name = 'body_markdown'
  ) then
    alter table public.tutorials rename column body to body_markdown;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tutorials'
      and column_name = 'thumbnail_url'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tutorials'
      and column_name = 'cover_image_url'
  ) then
    alter table public.tutorials rename column thumbnail_url to cover_image_url;
  end if;
end $$;

alter table public.tutorials
  add column if not exists user_id uuid,
  add column if not exists body_markdown text,
  add column if not exists cover_image_url text,
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists difficulty text,
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_published boolean not null default true;

update public.tutorials
set
  category = coalesce(nullif(trim(category), ''), 'general'),
  difficulty = coalesce(nullif(trim(difficulty), ''), 'beginner'),
  tags = coalesce(tags, '{}'::text[]),
  body_markdown = coalesce(body_markdown, ''),
  is_published = coalesce(is_published, published_at is not null, true),
  view_count = coalesce(view_count, 0),
  like_count = coalesce(like_count, 0),
  comment_count = coalesce(comment_count, 0),
  is_featured = coalesce(is_featured, false)
where true;

alter table public.tutorials
  drop constraint if exists tutorials_creator_id_fkey,
  drop constraint if exists tutorials_user_id_fkey;

alter table public.tutorials
  add constraint tutorials_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.tutorials
  alter column title set not null,
  alter column slug set not null,
  alter column user_id set not null,
  alter column body_markdown set not null,
  alter column cover_image_url drop not null,
  alter column category set default 'general',
  alter column difficulty set default 'beginner',
  alter column is_published set default true;

drop policy if exists "tutorials_select" on public.tutorials;
drop policy if exists "tutorials_insert" on public.tutorials;
drop policy if exists "tutorials_update" on public.tutorials;
drop policy if exists "tutorials_delete" on public.tutorials;
drop policy if exists "Public can view published tutorials" on public.tutorials;

alter table public.tutorials
  drop column if exists price_cents,
  drop column if exists video_id,
  drop column if exists published_at,
  drop column if exists preview_video_id;

create unique index if not exists idx_tutorials_slug on public.tutorials(slug);
create index if not exists idx_tutorials_category on public.tutorials(category);
create index if not exists idx_tutorials_user on public.tutorials(user_id);
create index if not exists idx_tutorials_tags on public.tutorials using gin(tags);
create index if not exists idx_tutorials_published_created
  on public.tutorials(created_at desc)
  where is_published = true;

create table if not exists public.tutorial_comments (
  id uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.tutorial_comments(id) on delete cascade,
  body text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_tutorial_comments_tutorial on public.tutorial_comments(tutorial_id);
create index if not exists idx_tutorial_comments_parent on public.tutorial_comments(parent_id);

create table if not exists public.tutorial_likes (
  id uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(tutorial_id, user_id)
);

create index if not exists idx_tutorial_likes_tutorial on public.tutorial_likes(tutorial_id);
create index if not exists idx_tutorial_likes_user on public.tutorial_likes(user_id);

alter table public.tutorials enable row level security;
alter table public.tutorial_comments enable row level security;
alter table public.tutorial_likes enable row level security;

drop policy if exists "tutorials_select" on public.tutorials;
drop policy if exists "tutorials_insert" on public.tutorials;
drop policy if exists "tutorials_update" on public.tutorials;
drop policy if exists "tutorials_delete" on public.tutorials;
drop policy if exists "tutorials_select_public_or_owner" on public.tutorials;
drop policy if exists "tutorials_insert_own" on public.tutorials;
drop policy if exists "tutorials_update_own" on public.tutorials;
drop policy if exists "tutorials_delete_own" on public.tutorials;

create policy "tutorials_select_public_or_owner"
  on public.tutorials
  for select
  using (is_published = true or user_id = auth.uid());

create policy "tutorials_insert_own"
  on public.tutorials
  for insert
  with check (user_id = auth.uid());

create policy "tutorials_update_own"
  on public.tutorials
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tutorials_delete_own"
  on public.tutorials
  for delete
  using (user_id = auth.uid());

drop policy if exists "tutorial_comments_select_visible" on public.tutorial_comments;
drop policy if exists "tutorial_comments_insert_own" on public.tutorial_comments;
drop policy if exists "tutorial_comments_delete_own" on public.tutorial_comments;

create policy "tutorial_comments_select_visible"
  on public.tutorial_comments
  for select
  using (
    exists (
      select 1
      from public.tutorials
      where tutorials.id = tutorial_comments.tutorial_id
        and (tutorials.is_published = true or tutorials.user_id = auth.uid())
    )
  );

create policy "tutorial_comments_insert_own"
  on public.tutorial_comments
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tutorials
      where tutorials.id = tutorial_comments.tutorial_id
        and (tutorials.is_published = true or tutorials.user_id = auth.uid())
    )
  );

create policy "tutorial_comments_delete_own"
  on public.tutorial_comments
  for delete
  using (user_id = auth.uid());

drop policy if exists "tutorial_likes_select_own" on public.tutorial_likes;
drop policy if exists "tutorial_likes_insert_own" on public.tutorial_likes;
drop policy if exists "tutorial_likes_delete_own" on public.tutorial_likes;

create policy "tutorial_likes_select_own"
  on public.tutorial_likes
  for select
  using (user_id = auth.uid());

create policy "tutorial_likes_insert_own"
  on public.tutorial_likes
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tutorials
      where tutorials.id = tutorial_likes.tutorial_id
        and tutorials.is_published = true
    )
  );

create policy "tutorial_likes_delete_own"
  on public.tutorial_likes
  for delete
  using (user_id = auth.uid());

drop trigger if exists set_tutorials_updated_at on public.tutorials;
create trigger set_tutorials_updated_at
  before update on public.tutorials
  for each row execute function public.set_updated_at();
