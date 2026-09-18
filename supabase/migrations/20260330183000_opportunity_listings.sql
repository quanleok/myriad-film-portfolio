create table if not exists public.opportunity_listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  poster_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company_name text not null,
  company_type text not null check (company_type in ('studio', 'brand', 'client')),
  work_type text not null check (work_type in ('freelance', 'contract', 'project', 'studio_collaboration')),
  summary text not null,
  description text not null,
  budget_min_cents integer null check (budget_min_cents is null or budget_min_cents >= 0),
  budget_max_cents integer null check (budget_max_cents is null or budget_max_cents >= 0),
  timeline_text text not null,
  location_text text not null,
  service_tags text[] not null default '{}',
  apply_url text null,
  contact_email text null,
  status text not null default 'draft' check (status in ('draft', 'payment_pending', 'pending_review', 'live', 'rejected', 'closed', 'expired')),
  stripe_checkout_session_id text null,
  stripe_payment_status text null,
  listing_fee_cents integer not null default 0 check (listing_fee_cents >= 0),
  paid_at timestamptz null,
  published_at timestamptz null,
  expires_at timestamptz null,
  closed_at timestamptz null,
  rejection_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_listings_apply_target_check check (
    (
      case when apply_url is not null and btrim(apply_url) <> '' then 1 else 0 end +
      case when contact_email is not null and btrim(contact_email) <> '' then 1 else 0 end
    ) = 1
  ),
  constraint opportunity_listings_budget_order_check check (
    budget_min_cents is null
    or budget_max_cents is null
    or budget_min_cents <= budget_max_cents
  )
);

create index if not exists idx_opportunity_listings_status_created
  on public.opportunity_listings(status, created_at desc);

create index if not exists idx_opportunity_listings_status_published
  on public.opportunity_listings(status, published_at desc);

create index if not exists idx_opportunity_listings_poster
  on public.opportunity_listings(poster_id, created_at desc);

create index if not exists idx_opportunity_listings_expires
  on public.opportunity_listings(expires_at);

create index if not exists idx_opportunity_listings_work_type
  on public.opportunity_listings(work_type);

create index if not exists idx_opportunity_listings_budget_max
  on public.opportunity_listings(budget_max_cents desc);

create index if not exists idx_opportunity_listings_service_tags
  on public.opportunity_listings using gin(service_tags);

alter table public.opportunity_listings enable row level security;

drop policy if exists "Public can view live opportunity listings" on public.opportunity_listings;
create policy "Public can view live opportunity listings"
  on public.opportunity_listings
  for select
  using (
    status = 'live'
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "Authenticated users can view own opportunity listings" on public.opportunity_listings;
create policy "Authenticated users can view own opportunity listings"
  on public.opportunity_listings
  for select
  to authenticated
  using (poster_id = auth.uid());

drop policy if exists "Authenticated users can insert own opportunity listings" on public.opportunity_listings;
create policy "Authenticated users can insert own opportunity listings"
  on public.opportunity_listings
  for insert
  to authenticated
  with check (poster_id = auth.uid());

drop policy if exists "Authenticated users can update own opportunity listings" on public.opportunity_listings;
create policy "Authenticated users can update own opportunity listings"
  on public.opportunity_listings
  for update
  to authenticated
  using (poster_id = auth.uid())
  with check (poster_id = auth.uid());

drop policy if exists "No client deletes opportunity listings" on public.opportunity_listings;
create policy "No client deletes opportunity listings"
  on public.opportunity_listings
  for delete
  to authenticated
  using (false);

drop trigger if exists set_opportunity_listings_updated_at on public.opportunity_listings;
create trigger set_opportunity_listings_updated_at
  before update on public.opportunity_listings
  for each row execute function public.set_updated_at();
