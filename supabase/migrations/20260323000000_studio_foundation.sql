-- Studio (Workshop Studio / Forge) — production workspace for solo AI filmmakers
-- All tables prefixed with studio_ to avoid collisions with Myriad marketplace tables
-- Reuses existing public.profiles for auth/user identity

-- ============================================================
-- Helper function (create if not exists)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text unique not null,
  logline text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'review', 'ready_to_render')),
  genre text not null default '',
  format text not null default 'feature' check (format in ('feature', 'short', 'series')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.studio_script_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.studio_projects(id) on delete cascade,
  format text not null default 'fountain' check (format in ('fountain')),
  current_version_id uuid,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_script_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  script_document_id uuid not null references public.studio_script_documents(id) on delete cascade,
  label text not null,
  summary text not null default '',
  author_type text not null check (author_type in ('user', 'ai')),
  provider_id text check (provider_id in ('openclaw', 'manual')),
  content text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved')),
  beat text not null default '',
  script_excerpt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_entities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  entity_type text not null check (entity_type in ('character', 'location', 'prop')),
  name text not null,
  summary text not null default '',
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_scene_entities (
  scene_id uuid not null references public.studio_scenes(id) on delete cascade,
  entity_id uuid not null references public.studio_entities(id) on delete cascade,
  primary key (scene_id, entity_id)
);

create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  asset_type text not null check (asset_type in ('image', 'video', 'audio', 'document')),
  status text not null default 'reference' check (status in ('reference', 'candidate', 'approved', 'final')),
  title text not null,
  description text not null default '',
  provider_id text check (provider_id in ('openclaw', 'manual')),
  prompt text,
  source_url text,
  storage_key text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_scene_assets (
  scene_id uuid not null references public.studio_scenes(id) on delete cascade,
  asset_id uuid not null references public.studio_assets(id) on delete cascade,
  primary key (scene_id, asset_id)
);

create table if not exists public.studio_entity_assets (
  entity_id uuid not null references public.studio_entities(id) on delete cascade,
  asset_id uuid not null references public.studio_assets(id) on delete cascade,
  primary key (entity_id, asset_id)
);

create table if not exists public.studio_ai_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  title text not null,
  context_type text not null check (context_type in ('project', 'scene', 'entity', 'asset')),
  context_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_ai_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  thread_id uuid references public.studio_ai_threads(id) on delete set null,
  provider_id text not null check (provider_id in ('openclaw', 'manual')),
  task_kind text not null check (task_kind in ('script_rewrite', 'scene_expand', 'character_generate', 'media_generate', 'render_kickoff')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  target_type text not null check (target_type in ('project', 'scene', 'entity', 'asset')),
  target_id uuid,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  provider_id text not null check (provider_id in ('openclaw', 'manual')),
  asset_type text not null check (asset_type in ('image', 'video', 'audio')),
  status text not null default 'queued' check (status in ('queued', 'preparing', 'rendering', 'completed', 'failed')),
  label text not null,
  cost_cents integer not null default 0,
  output_asset_id uuid references public.studio_assets(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  slug text not null unique,
  access text not null default 'reviewer' check (access in ('public', 'reviewer', 'private')),
  allow_downloads boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS helper functions
-- ============================================================

create or replace function public.studio_user_can_view(project_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.studio_projects p
    where p.id = project_uuid
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.studio_project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.studio_user_can_edit(project_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.studio_projects p
    where p.id = project_uuid
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.studio_project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
            and pm.role = 'editor'
        )
      )
  );
$$;

-- ============================================================
-- Enable RLS
-- ============================================================

alter table public.studio_projects enable row level security;
alter table public.studio_project_members enable row level security;
alter table public.studio_script_documents enable row level security;
alter table public.studio_script_versions enable row level security;
alter table public.studio_scenes enable row level security;
alter table public.studio_entities enable row level security;
alter table public.studio_scene_entities enable row level security;
alter table public.studio_assets enable row level security;
alter table public.studio_scene_assets enable row level security;
alter table public.studio_entity_assets enable row level security;
alter table public.studio_ai_threads enable row level security;
alter table public.studio_ai_runs enable row level security;
alter table public.studio_generation_jobs enable row level security;
alter table public.studio_share_links enable row level security;

-- ============================================================
-- RLS Policies
-- ============================================================

-- studio_projects
create policy "studio_projects owner insert"
  on public.studio_projects for insert
  with check (owner_id = auth.uid());

create policy "studio_projects visible to owner and members"
  on public.studio_projects for select
  using (public.studio_user_can_view(id));

create policy "studio_projects owner update"
  on public.studio_projects for update
  using (owner_id = auth.uid());

create policy "studio_projects owner delete"
  on public.studio_projects for delete
  using (owner_id = auth.uid());

-- studio_project_members
create policy "studio_project_members owner manage"
  on public.studio_project_members for all
  using (
    exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.studio_projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- studio_script_documents
create policy "studio_script_documents view"
  on public.studio_script_documents for select
  using (public.studio_user_can_view(project_id));

create policy "studio_script_documents edit"
  on public.studio_script_documents for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_script_versions
create policy "studio_script_versions view"
  on public.studio_script_versions for select
  using (public.studio_user_can_view(project_id));

create policy "studio_script_versions edit"
  on public.studio_script_versions for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_scenes
create policy "studio_scenes view"
  on public.studio_scenes for select
  using (public.studio_user_can_view(project_id));

create policy "studio_scenes edit"
  on public.studio_scenes for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_entities
create policy "studio_entities view"
  on public.studio_entities for select
  using (public.studio_user_can_view(project_id));

create policy "studio_entities edit"
  on public.studio_entities for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_scene_entities
create policy "studio_scene_entities view"
  on public.studio_scene_entities for select
  using (
    exists (select 1 from public.studio_scenes s where s.id = scene_id and public.studio_user_can_view(s.project_id))
  );

create policy "studio_scene_entities edit"
  on public.studio_scene_entities for all
  using (
    exists (select 1 from public.studio_scenes s where s.id = scene_id and public.studio_user_can_edit(s.project_id))
  )
  with check (
    exists (select 1 from public.studio_scenes s where s.id = scene_id and public.studio_user_can_edit(s.project_id))
  );

-- studio_assets
create policy "studio_assets view"
  on public.studio_assets for select
  using (public.studio_user_can_view(project_id));

create policy "studio_assets edit"
  on public.studio_assets for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_scene_assets
create policy "studio_scene_assets view"
  on public.studio_scene_assets for select
  using (
    exists (select 1 from public.studio_scenes s where s.id = scene_id and public.studio_user_can_view(s.project_id))
  );

create policy "studio_scene_assets edit"
  on public.studio_scene_assets for all
  using (
    exists (select 1 from public.studio_scenes s where s.id = scene_id and public.studio_user_can_edit(s.project_id))
  )
  with check (
    exists (select 1 from public.studio_scenes s where s.id = scene_id and public.studio_user_can_edit(s.project_id))
  );

-- studio_entity_assets
create policy "studio_entity_assets view"
  on public.studio_entity_assets for select
  using (
    exists (select 1 from public.studio_entities e where e.id = entity_id and public.studio_user_can_view(e.project_id))
  );

create policy "studio_entity_assets edit"
  on public.studio_entity_assets for all
  using (
    exists (select 1 from public.studio_entities e where e.id = entity_id and public.studio_user_can_edit(e.project_id))
  )
  with check (
    exists (select 1 from public.studio_entities e where e.id = entity_id and public.studio_user_can_edit(e.project_id))
  );

-- studio_ai_threads
create policy "studio_ai_threads view"
  on public.studio_ai_threads for select
  using (public.studio_user_can_view(project_id));

create policy "studio_ai_threads edit"
  on public.studio_ai_threads for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_ai_runs
create policy "studio_ai_runs view"
  on public.studio_ai_runs for select
  using (public.studio_user_can_view(project_id));

create policy "studio_ai_runs edit"
  on public.studio_ai_runs for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_generation_jobs
create policy "studio_generation_jobs view"
  on public.studio_generation_jobs for select
  using (public.studio_user_can_view(project_id));

create policy "studio_generation_jobs edit"
  on public.studio_generation_jobs for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- studio_share_links
create policy "studio_share_links view"
  on public.studio_share_links for select
  using (public.studio_user_can_view(project_id));

create policy "studio_share_links edit"
  on public.studio_share_links for all
  using (public.studio_user_can_edit(project_id))
  with check (public.studio_user_can_edit(project_id));

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_studio_projects_owner on public.studio_projects (owner_id);
create index if not exists idx_studio_projects_slug on public.studio_projects (slug);
create index if not exists idx_studio_project_members_project on public.studio_project_members (project_id);
create index if not exists idx_studio_script_versions_project on public.studio_script_versions (project_id, created_at desc);
create index if not exists idx_studio_scenes_project on public.studio_scenes (project_id, sort_order);
create index if not exists idx_studio_entities_project on public.studio_entities (project_id, entity_type);
create index if not exists idx_studio_assets_project on public.studio_assets (project_id, asset_type, status);
create index if not exists idx_studio_ai_runs_project on public.studio_ai_runs (project_id, created_at desc);
create index if not exists idx_studio_generation_jobs_project on public.studio_generation_jobs (project_id, created_at desc);

-- ============================================================
-- Updated-at triggers (reuses existing set_updated_at function)
-- ============================================================

create trigger set_studio_projects_updated_at before update on public.studio_projects for each row execute function public.set_updated_at();
create trigger set_studio_script_documents_updated_at before update on public.studio_script_documents for each row execute function public.set_updated_at();
create trigger set_studio_scenes_updated_at before update on public.studio_scenes for each row execute function public.set_updated_at();
create trigger set_studio_entities_updated_at before update on public.studio_entities for each row execute function public.set_updated_at();
create trigger set_studio_assets_updated_at before update on public.studio_assets for each row execute function public.set_updated_at();
create trigger set_studio_ai_threads_updated_at before update on public.studio_ai_threads for each row execute function public.set_updated_at();
create trigger set_studio_ai_runs_updated_at before update on public.studio_ai_runs for each row execute function public.set_updated_at();
create trigger set_studio_generation_jobs_updated_at before update on public.studio_generation_jobs for each row execute function public.set_updated_at();
