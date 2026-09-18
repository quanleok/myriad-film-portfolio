-- ============================================================
-- Tavern — social + messaging layer
-- ============================================================

create table if not exists public.tavern_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.tavern_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm', 'group')),
  name text,
  avatar_url text,
  created_by uuid references public.profiles(id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tavern_conversation_members (
  conversation_id uuid not null references public.tavern_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.tavern_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tavern_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  attachment_type text check (attachment_type in ('image', 'link', 'worldhub_asset', 'ironforge_project')),
  attachment_url text,
  attachment_meta jsonb,
  reply_to_id uuid references public.tavern_messages(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tavern_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  media_urls text[] not null default '{}',
  linked_type text check (linked_type in ('worldhub_asset', 'ironforge_project', 'video', 'profile')),
  linked_id uuid,
  post_type text not null default 'general' check (post_type in ('general', 'wip', 'question', 'showcase', 'behind_scenes', 'collab_request', 'announcement')),
  like_count integer not null default 0,
  reply_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'flagged', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tavern_post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.tavern_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.tavern_post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.tavern_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  like_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'flagged', 'removed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_tavern_friendships_requester on public.tavern_friendships (requester_id, status);
create index if not exists idx_tavern_friendships_addressee on public.tavern_friendships (addressee_id, status);
create index if not exists idx_tavern_conv_members_user on public.tavern_conversation_members (user_id);
create index if not exists idx_tavern_messages_conversation on public.tavern_messages (conversation_id, created_at desc) where deleted_at is null;
create index if not exists idx_tavern_posts_feed on public.tavern_posts (created_at desc) where status = 'active';
create index if not exists idx_tavern_posts_author on public.tavern_posts (author_id);
create index if not exists idx_tavern_posts_type on public.tavern_posts (post_type, created_at desc) where status = 'active';
create index if not exists idx_tavern_replies_post on public.tavern_post_replies (post_id, created_at);

alter table public.tavern_friendships enable row level security;
alter table public.tavern_conversations enable row level security;
alter table public.tavern_conversation_members enable row level security;
alter table public.tavern_messages enable row level security;
alter table public.tavern_posts enable row level security;
alter table public.tavern_post_likes enable row level security;
alter table public.tavern_post_replies enable row level security;

create policy "tavern_friendships_read_own"
  on public.tavern_friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "tavern_friendships_create_own"
  on public.tavern_friendships for insert
  with check (requester_id = auth.uid());

create policy "tavern_friendships_update_own"
  on public.tavern_friendships for update
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "tavern_friendships_delete_own"
  on public.tavern_friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "tavern_conversations_read_member"
  on public.tavern_conversations for select
  using (
    exists (
      select 1
      from public.tavern_conversation_members m
      where m.conversation_id = tavern_conversations.id
        and m.user_id = auth.uid()
    )
  );

create policy "tavern_conversation_members_read_member"
  on public.tavern_conversation_members for select
  using (
    exists (
      select 1
      from public.tavern_conversation_members m
      where m.conversation_id = tavern_conversation_members.conversation_id
        and m.user_id = auth.uid()
    )
  );

create policy "tavern_messages_read_member"
  on public.tavern_messages for select
  using (
    exists (
      select 1
      from public.tavern_conversation_members m
      where m.conversation_id = tavern_messages.conversation_id
        and m.user_id = auth.uid()
    )
  );

create policy "tavern_posts_read_active"
  on public.tavern_posts for select
  using (status = 'active');

create policy "tavern_posts_create_own"
  on public.tavern_posts for insert
  with check (author_id = auth.uid());

create policy "tavern_posts_update_own"
  on public.tavern_posts for update
  using (author_id = auth.uid());

create policy "tavern_posts_delete_own"
  on public.tavern_posts for delete
  using (author_id = auth.uid());

create policy "tavern_post_likes_read"
  on public.tavern_post_likes for select
  using (true);

create policy "tavern_post_likes_manage_own"
  on public.tavern_post_likes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tavern_post_replies_read_active"
  on public.tavern_post_replies for select
  using (status = 'active');

create policy "tavern_post_replies_create_own"
  on public.tavern_post_replies for insert
  with check (author_id = auth.uid());

create or replace function public.tavern_touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.tavern_conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.content, 180),
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create or replace function public.tavern_update_post_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.tavern_posts
    set like_count = like_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.tavern_posts
  set like_count = greatest(like_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

create or replace function public.tavern_update_post_reply_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.tavern_posts
    set reply_count = reply_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.tavern_posts
  set reply_count = greatest(reply_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists tr_tavern_friendships_updated_at on public.tavern_friendships;
create trigger tr_tavern_friendships_updated_at
  before update on public.tavern_friendships
  for each row execute function update_updated_at();

drop trigger if exists tr_tavern_conversations_updated_at on public.tavern_conversations;
create trigger tr_tavern_conversations_updated_at
  before update on public.tavern_conversations
  for each row execute function update_updated_at();

drop trigger if exists tr_tavern_messages_updated_at on public.tavern_messages;
create trigger tr_tavern_messages_updated_at
  before update on public.tavern_messages
  for each row execute function update_updated_at();

drop trigger if exists tr_tavern_posts_updated_at on public.tavern_posts;
create trigger tr_tavern_posts_updated_at
  before update on public.tavern_posts
  for each row execute function update_updated_at();

drop trigger if exists tr_tavern_message_touch_conversation on public.tavern_messages;
create trigger tr_tavern_message_touch_conversation
  after insert on public.tavern_messages
  for each row execute function public.tavern_touch_conversation();

drop trigger if exists tr_tavern_post_like_count on public.tavern_post_likes;
create trigger tr_tavern_post_like_count
  after insert or delete on public.tavern_post_likes
  for each row execute function public.tavern_update_post_like_count();

drop trigger if exists tr_tavern_post_reply_count on public.tavern_post_replies;
create trigger tr_tavern_post_reply_count
  after insert or delete on public.tavern_post_replies
  for each row execute function public.tavern_update_post_reply_count();
