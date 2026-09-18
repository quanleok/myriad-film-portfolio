-- Playlists feature
create table playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  is_public boolean not null default true,
  video_count integer not null default 0,
  total_duration_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists(id) on delete cascade,
  video_id uuid not null references videos(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  unique(playlist_id, video_id)
);

-- Indexes
create index idx_playlists_user_id on playlists(user_id);
create index idx_playlist_items_playlist_id on playlist_items(playlist_id);
create index idx_playlist_items_video_id on playlist_items(video_id);

-- RLS
alter table playlists enable row level security;
alter table playlist_items enable row level security;

-- Playlists: owner can do everything, others can read public playlists
create policy "Users can manage own playlists"
  on playlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can view public playlists"
  on playlists for select
  using (is_public = true);

-- Playlist items: owner can manage, anyone can read items of public playlists
create policy "Playlist owner can manage items"
  on playlist_items for all
  using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_items.playlist_id
      and playlists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from playlists
      where playlists.id = playlist_items.playlist_id
      and playlists.user_id = auth.uid()
    )
  );

create policy "Anyone can view items of public playlists"
  on playlist_items for select
  using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_items.playlist_id
      and playlists.is_public = true
    )
  );

-- Function to update playlist counts when items change
create or replace function update_playlist_counts()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update playlists
    set video_count = (select count(*) from playlist_items where playlist_id = new.playlist_id),
        total_duration_seconds = (
          select coalesce(sum(v.duration_seconds), 0)
          from playlist_items pi
          join videos v on v.id = pi.video_id
          where pi.playlist_id = new.playlist_id
        ),
        updated_at = now()
    where id = new.playlist_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update playlists
    set video_count = (select count(*) from playlist_items where playlist_id = old.playlist_id),
        total_duration_seconds = (
          select coalesce(sum(v.duration_seconds), 0)
          from playlist_items pi
          join videos v on v.id = pi.video_id
          where pi.playlist_id = old.playlist_id
        ),
        updated_at = now()
    where id = old.playlist_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_playlist_items_count
after insert or delete on playlist_items
for each row execute function update_playlist_counts();
