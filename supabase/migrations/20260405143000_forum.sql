create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body_markdown text not null,
  category text not null default 'general',
  tags text[] not null default '{}',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  view_count integer not null default 0,
  is_pinned boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  parent_id uuid references public.forum_comments(id) on delete cascade,
  body_markdown text not null,
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.forum_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.forum_comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id)
);

create index if not exists idx_forum_posts_category on public.forum_posts(category);
create index if not exists idx_forum_posts_user on public.forum_posts(user_id);
create index if not exists idx_forum_posts_created on public.forum_posts(created_at desc);
create index if not exists idx_forum_comments_post on public.forum_comments(post_id);
create index if not exists idx_forum_comments_parent on public.forum_comments(parent_id);

create or replace function public.set_forum_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
before update on public.forum_posts
for each row execute function public.set_forum_updated_at();

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_post_likes enable row level security;
alter table public.forum_comment_likes enable row level security;

drop policy if exists "Public can view published forum posts" on public.forum_posts;
create policy "Public can view published forum posts"
  on public.forum_posts for select
  using (is_published = true);

drop policy if exists "Auth users can create forum posts" on public.forum_posts;
create policy "Auth users can create forum posts"
  on public.forum_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own forum posts" on public.forum_posts;
create policy "Users can update own forum posts"
  on public.forum_posts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own forum posts" on public.forum_posts;
create policy "Users can delete own forum posts"
  on public.forum_posts for delete
  using (auth.uid() = user_id);

drop policy if exists "Public can view forum comments" on public.forum_comments;
create policy "Public can view forum comments"
  on public.forum_comments for select
  using (true);

drop policy if exists "Auth users can create forum comments" on public.forum_comments;
create policy "Auth users can create forum comments"
  on public.forum_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own forum comments" on public.forum_comments;
create policy "Users can delete own forum comments"
  on public.forum_comments for delete
  using (auth.uid() = user_id);

drop policy if exists "Public can view forum post likes" on public.forum_post_likes;
create policy "Public can view forum post likes"
  on public.forum_post_likes for select
  using (true);

drop policy if exists "Auth users can like forum posts" on public.forum_post_likes;
create policy "Auth users can like forum posts"
  on public.forum_post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike forum posts" on public.forum_post_likes;
create policy "Users can unlike forum posts"
  on public.forum_post_likes for delete
  using (auth.uid() = user_id);

drop policy if exists "Public can view forum comment likes" on public.forum_comment_likes;
create policy "Public can view forum comment likes"
  on public.forum_comment_likes for select
  using (true);

drop policy if exists "Auth users can like forum comments" on public.forum_comment_likes;
create policy "Auth users can like forum comments"
  on public.forum_comment_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike forum comments" on public.forum_comment_likes;
create policy "Users can unlike forum comments"
  on public.forum_comment_likes for delete
  using (auth.uid() = user_id);
