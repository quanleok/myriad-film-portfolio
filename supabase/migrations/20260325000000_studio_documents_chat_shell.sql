-- Studio v2 shell: file-based writing workspace with chat

create table if not exists public.studio_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  path text not null,
  title text not null,
  kind text not null default 'markdown' check (kind in ('text', 'markdown', 'fountain', 'notes')),
  content text not null default '',
  summary text not null default '',
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create table if not exists public.studio_chat_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  title text not null,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.studio_chat_threads(id) on delete cascade,
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  referenced_document_ids jsonb not null default '[]'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.studio_documents enable row level security;
alter table public.studio_chat_threads enable row level security;
alter table public.studio_chat_messages enable row level security;

create policy "studio_documents view"
  on public.studio_documents for select
  using (public.studio_user_can_view(project_id));

create policy "studio_documents edit"
  on public.studio_documents for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

create policy "studio_chat_threads view"
  on public.studio_chat_threads for select
  using (public.studio_user_can_view(project_id));

create policy "studio_chat_threads edit"
  on public.studio_chat_threads for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

create policy "studio_chat_messages view"
  on public.studio_chat_messages for select
  using (public.studio_user_can_view(project_id));

create policy "studio_chat_messages edit"
  on public.studio_chat_messages for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

create trigger set_studio_documents_updated_at
before update on public.studio_documents
for each row execute function public.set_updated_at();

create trigger set_studio_chat_threads_updated_at
before update on public.studio_chat_threads
for each row execute function public.set_updated_at();

-- Prevent multiple default threads per project
create unique index studio_chat_threads_default_unique
  on public.studio_chat_threads (project_id)
  where (is_default = true);

-- Index for fast message loading by thread
create index studio_chat_messages_thread_created
  on public.studio_chat_messages (thread_id, created_at);
