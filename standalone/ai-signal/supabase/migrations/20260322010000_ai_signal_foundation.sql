create schema if not exists signal;

create extension if not exists pgcrypto;

create table if not exists signal.categories (
  slug text primary key,
  name text not null,
  tagline text not null,
  description text not null,
  accent text not null,
  created_at timestamptz not null default now()
);

create table if not exists signal.tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_slug text not null references signal.categories(slug) on delete restrict,
  company_name text not null,
  name text not null,
  summary text not null,
  website_url text not null,
  pricing_summary text not null,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  best_for text[] not null default '{}',
  saved_count integer not null default 0,
  discussion_volume integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists signal.tool_releases (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references signal.tools(id) on delete cascade,
  label text not null,
  note text not null,
  released_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists signal.profiles (
  id uuid primary key,
  handle text not null unique,
  display_name text not null,
  role_label text not null,
  bio text not null default '',
  follower_count integer not null default 0,
  credibility_label text not null default 'Community voice',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists signal.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references signal.profiles(id) on delete cascade,
  category_slug text not null references signal.categories(slug) on delete restrict,
  post_type text not null,
  title text not null,
  body text not null,
  external_url text,
  linked_tool_slugs text[] not null default '{}',
  reaction_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists signal.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references signal.posts(id) on delete cascade,
  author_id uuid not null references signal.profiles(id) on delete cascade,
  parent_comment_id uuid references signal.post_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists signal.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references signal.posts(id) on delete cascade,
  user_id uuid not null,
  reaction_type text not null default 'upvote',
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction_type)
);

create table if not exists signal.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references signal.categories(slug) on delete restrict,
  lens text not null,
  tool_id uuid not null references signal.tools(id) on delete cascade,
  rank integer not null,
  previous_rank integer,
  score numeric(5,2) not null,
  editorial_weight numeric(5,2) not null,
  community_weight numeric(5,2) not null,
  velocity_weight numeric(5,2) not null,
  rationale text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_slug, lens, rank),
  unique (category_slug, lens, tool_id)
);

create table if not exists signal.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references signal.categories(slug) on delete restrict,
  lens text not null,
  snapshot_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists signal.follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null,
  target_type text not null,
  target_slug text not null,
  created_at timestamptz not null default now(),
  unique (follower_user_id, target_type, target_slug)
);

create table if not exists signal.trend_events (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null references signal.categories(slug) on delete restrict,
  label text not null,
  summary text not null,
  movement text not null,
  signal_score numeric(5,2) not null,
  references jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signal_tools_category_idx on signal.tools(category_slug);
create index if not exists signal_posts_category_idx on signal.posts(category_slug, created_at desc);
create index if not exists signal_posts_author_idx on signal.posts(author_id, created_at desc);
create index if not exists signal_leaderboard_lookup_idx on signal.leaderboard_entries(category_slug, lens, rank);
create index if not exists signal_trend_score_idx on signal.trend_events(signal_score desc);

alter table signal.categories enable row level security;
alter table signal.tools enable row level security;
alter table signal.tool_releases enable row level security;
alter table signal.profiles enable row level security;
alter table signal.posts enable row level security;
alter table signal.post_comments enable row level security;
alter table signal.post_reactions enable row level security;
alter table signal.leaderboard_entries enable row level security;
alter table signal.leaderboard_snapshots enable row level security;
alter table signal.follows enable row level security;
alter table signal.trend_events enable row level security;

create policy "signal read categories"
  on signal.categories for select
  using (true);

create policy "signal read tools"
  on signal.tools for select
  using (true);

create policy "signal read tool releases"
  on signal.tool_releases for select
  using (true);

create policy "signal read profiles"
  on signal.profiles for select
  using (true);

create policy "signal read posts"
  on signal.posts for select
  using (true);

create policy "signal read post comments"
  on signal.post_comments for select
  using (true);

create policy "signal read reactions"
  on signal.post_reactions for select
  using (true);

create policy "signal read leaderboard entries"
  on signal.leaderboard_entries for select
  using (true);

create policy "signal read leaderboard snapshots"
  on signal.leaderboard_snapshots for select
  using (true);

create policy "signal read follows"
  on signal.follows for select
  using (true);

create policy "signal read trend events"
  on signal.trend_events for select
  using (true);
