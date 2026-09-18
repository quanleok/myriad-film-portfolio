alter table public.profiles
  add column if not exists hire_specialties text[] not null default '{}',
  add column if not exists hire_availability text null,
  add column if not exists hire_price_band text null;

alter table public.profiles
  drop constraint if exists profiles_hire_availability_check,
  add constraint profiles_hire_availability_check
    check (
      hire_availability is null
      or hire_availability in ('open', 'limited', 'booked')
    ),
  drop constraint if exists profiles_hire_price_band_check,
  add constraint profiles_hire_price_band_check
    check (
      hire_price_band is null
      or hire_price_band in ('budget', 'standard', 'premium')
    );

alter table public.opportunity_listings
  add column if not exists listing_kind text,
  add column if not exists promotion_tier text,
  add column if not exists promotion_ends_at timestamptz null,
  add column if not exists is_seeded boolean not null default false;

update public.opportunity_listings
set listing_kind = coalesce(listing_kind, 'job'),
    promotion_tier = coalesce(
      promotion_tier,
      case
        when coalesce(listing_fee_cents, 0) > 0 then 'featured'
        else 'free'
      end
    ),
    promotion_ends_at = coalesce(
      promotion_ends_at,
      case
        when coalesce(listing_fee_cents, 0) > 0 then expires_at
        else null
      end
    ),
    is_seeded = coalesce(is_seeded, false);

alter table public.opportunity_listings
  alter column listing_kind set default 'job',
  alter column listing_kind set not null,
  alter column promotion_tier set default 'free',
  alter column promotion_tier set not null;

alter table public.opportunity_listings
  drop constraint if exists opportunity_listings_listing_kind_check,
  add constraint opportunity_listings_listing_kind_check
    check (listing_kind in ('job', 'service_offer')),
  drop constraint if exists opportunity_listings_promotion_tier_check,
  add constraint opportunity_listings_promotion_tier_check
    check (promotion_tier in ('free', 'featured'));

alter table public.opportunity_listings
  drop constraint if exists opportunity_listings_apply_target_check,
  add constraint opportunity_listings_apply_target_check
    check (
      (
        is_seeded = true
        and coalesce(nullif(btrim(apply_url), ''), null) is null
        and coalesce(nullif(btrim(contact_email), ''), null) is null
      )
      or
      (
        is_seeded = false
        and (
          case when apply_url is not null and btrim(apply_url) <> '' then 1 else 0 end +
          case when contact_email is not null and btrim(contact_email) <> '' then 1 else 0 end
        ) = 1
      )
    );

create index if not exists idx_opportunity_listings_listing_kind
  on public.opportunity_listings(listing_kind);

create index if not exists idx_opportunity_listings_promotion_tier
  on public.opportunity_listings(promotion_tier, published_at desc);

create index if not exists idx_profiles_hire_specialties
  on public.profiles using gin(hire_specialties);

create index if not exists idx_profiles_hire_availability
  on public.profiles(hire_availability);

create index if not exists idx_profiles_hire_price_band
  on public.profiles(hire_price_band);


-- Portfolio copy: private demo-account and opportunity seed data omitted.
-- All schema, data-normalization, constraints and indexes above are preserved.
