-- =============================================================================
-- Myriad Spring: Project & Preorder System
-- Creates all tables for the interactive preorder marketplace pivot
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom ENUM types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE project_lifecycle_status AS ENUM (
    'draft',
    'unlocking',
    'in_production',
    'premiering',
    'released',
    'failed_to_unlock',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_moderation_status AS ENUM (
    'private_draft',
    'pending_review',
    'live',
    'flagged',
    'suspended',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_update_type AS ENUM (
    'text',
    'image',
    'video',
    'progress_proof'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_release_type AS ENUM (
    'unlock',
    'progress_proof',
    'delivery'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_release_status AS ENUM (
    'pending',
    'available',
    'withdrawn',
    'forfeited'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE preorder_status AS ENUM (
    'active',
    'committed',
    'refunded',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE proof_review_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE financial_event_type AS ENUM (
    'preorder_charge',
    'preorder_refund',
    'payout_release_available',
    'payout_withdrawn',
    'late_preorder_charge',
    'platform_fee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entitlement_source AS ENUM (
    'preorder',
    'purchase',
    'admin_grant'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Projects table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug text UNIQUE,
  title text NOT NULL,
  hook text,
  synopsis text,
  genre text,
  tone text,
  format text,
  runtime_minutes integer,
  teaser_asset_id text,
  teaser_thumbnail_url text,
  preorder_price_cents integer CHECK (preorder_price_cents IS NULL OR (preorder_price_cents >= 300 AND preorder_price_cents <= 1500)),
  unlock_target integer CHECK (unlock_target IS NULL OR (unlock_target >= 50 AND unlock_target <= 2000)),
  production_window_days integer CHECK (production_window_days IS NULL OR production_window_days IN (30, 60, 90, 180)),
  campaign_duration_days integer CHECK (campaign_duration_days IS NULL OR campaign_duration_days IN (14, 21, 30)),
  campaign_starts_at timestamptz,
  campaign_ends_at timestamptz,
  unlocked_at timestamptz,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  film_video_id uuid REFERENCES videos(id),
  lifecycle_status project_lifecycle_status NOT NULL DEFAULT 'draft',
  moderation_status project_moderation_status NOT NULL DEFAULT 'private_draft',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'unlisted')),
  rights_attested_at timestamptz,
  creator_terms_version text,
  preorder_count_cache integer NOT NULL DEFAULT 0,
  like_count_cache integer NOT NULL DEFAULT 0,
  discussion_count_cache integer NOT NULL DEFAULT 0,
  inspiration_line text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_creator ON projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_lifecycle ON projects(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_projects_moderation ON projects(moderation_status);
CREATE INDEX IF NOT EXISTS idx_projects_campaign_ends ON projects(campaign_ends_at) WHERE lifecycle_status = 'unlocking';

-- ---------------------------------------------------------------------------
-- 3. Project character cards
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_character_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  short_description text,
  media_asset_id text,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_character_cards_project ON project_character_cards(project_id);

-- ---------------------------------------------------------------------------
-- 4. Project concept cards
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_concept_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  caption text,
  media_asset_id text,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_cards_project ON project_concept_cards(project_id);

-- ---------------------------------------------------------------------------
-- 5. Preorders
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id text,
  current_status preorder_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  refunded_at timestamptz,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_preorders_project ON project_preorders(project_id);
CREATE INDEX IF NOT EXISTS idx_preorders_user ON project_preorders(user_id);
CREATE INDEX IF NOT EXISTS idx_preorders_status ON project_preorders(current_status);

-- ---------------------------------------------------------------------------
-- 6. Project updates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  update_type project_update_type NOT NULL DEFAULT 'text',
  title text,
  body text,
  media_asset_id text,
  is_progress_proof boolean NOT NULL DEFAULT false,
  review_status proof_review_status,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_updates_project ON project_updates(project_id);

-- ---------------------------------------------------------------------------
-- 7. Discussion posts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_discussion_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_post_id uuid REFERENCES project_discussion_posts(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_creator_reply boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  upvote_count_cache integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discussion_project ON project_discussion_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_discussion_parent ON project_discussion_posts(parent_post_id);

-- ---------------------------------------------------------------------------
-- 8. Discussion upvotes (for dedup)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_discussion_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES project_discussion_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 9. Payout releases
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_payout_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  release_type payout_release_type NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status payout_release_status NOT NULL DEFAULT 'pending',
  available_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_releases_project ON project_payout_releases(project_id);

-- ---------------------------------------------------------------------------
-- 10. Entitlements
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id),
  source_type entitlement_source NOT NULL DEFAULT 'preorder',
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user ON project_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_project ON project_entitlements(project_id);

-- ---------------------------------------------------------------------------
-- 11. Status history (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_project ON project_status_history(project_id);

-- ---------------------------------------------------------------------------
-- 12. Financial events (immutable ledger)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  preorder_id uuid REFERENCES project_preorders(id),
  payout_release_id uuid REFERENCES project_payout_releases(id),
  event_type financial_event_type NOT NULL,
  amount_cents integer NOT NULL,
  stripe_object_id text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_events_project ON project_financial_events(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_type ON project_financial_events(event_type);

-- ---------------------------------------------------------------------------
-- 13. Project likes (dedup)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_likes_project ON project_likes(project_id);

-- ---------------------------------------------------------------------------
-- 14. Profile extensions
-- ---------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS delivery_record_summary jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS creator_good_standing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS strike_count integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 15. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_character_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_concept_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_preorders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_discussion_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_payout_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_likes ENABLE ROW LEVEL SECURITY;

-- Projects: public can view live projects, creators can manage their own
DO $$ BEGIN
  CREATE POLICY "Anyone can view public live projects" ON projects
    FOR SELECT USING (
      visibility = 'public' AND moderation_status = 'live'
      OR creator_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can insert own projects" ON projects
    FOR INSERT WITH CHECK (creator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can update own projects" ON projects
    FOR UPDATE USING (creator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Character cards: public read on live projects, creator write
DO $$ BEGIN
  CREATE POLICY "Anyone can view character cards of live projects" ON project_character_cards
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.moderation_status = 'live' AND p.visibility = 'public')
      OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can manage character cards" ON project_character_cards
    FOR ALL USING (
      EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Concept cards: same pattern
DO $$ BEGIN
  CREATE POLICY "Anyone can view concept cards of live projects" ON project_concept_cards
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.moderation_status = 'live' AND p.visibility = 'public')
      OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can manage concept cards" ON project_concept_cards
    FOR ALL USING (
      EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Preorders: users can view own, insert via service role (API route), cancel own
DO $$ BEGIN
  CREATE POLICY "Users can view own preorders" ON project_preorders
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role inserts preorders" ON project_preorders
    FOR INSERT WITH CHECK (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role updates preorders" ON project_preorders
    FOR UPDATE USING (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Updates: public read on live projects, creator write
DO $$ BEGIN
  CREATE POLICY "Anyone can view updates of live projects" ON project_updates
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.moderation_status = 'live' AND p.visibility = 'public')
      OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can insert updates" ON project_updates
    FOR INSERT WITH CHECK (creator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Discussion: public read, auth write
DO $$ BEGIN
  CREATE POLICY "Anyone can view discussion on live projects" ON project_discussion_posts
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.moderation_status = 'live' AND p.visibility = 'public')
      OR user_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users can post in discussion" ON project_discussion_posts
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Discussion upvotes
DO $$ BEGIN
  CREATE POLICY "Auth users can manage own upvotes" ON project_discussion_upvotes
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Payout releases: creator can view own project releases, service role manages
DO $$ BEGIN
  CREATE POLICY "Creators can view own payout releases" ON project_payout_releases
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.creator_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages payout releases" ON project_payout_releases
    FOR ALL USING (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Entitlements: users can view own
DO $$ BEGIN
  CREATE POLICY "Users can view own entitlements" ON project_entitlements
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role manages entitlements" ON project_entitlements
    FOR ALL USING (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status history: public read
DO $$ BEGIN
  CREATE POLICY "Anyone can view status history" ON project_status_history
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role inserts status history" ON project_status_history
    FOR INSERT WITH CHECK (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Financial events: service role only
DO $$ BEGIN
  CREATE POLICY "Service role manages financial events" ON project_financial_events
    FOR ALL USING (
      current_setting('request.jwt.claim.role', true) = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Project likes: auth users can manage own
DO $$ BEGIN
  CREATE POLICY "Users can view project likes" ON project_likes
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users can manage own likes" ON project_likes
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 16. Trigger: auto-update preorder_count_cache
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_project_preorder_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE projects SET preorder_count_cache = (
      SELECT COUNT(*) FROM project_preorders
      WHERE project_id = NEW.project_id AND current_status IN ('active', 'committed')
    ) WHERE id = NEW.project_id;
  END IF;
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE projects SET preorder_count_cache = (
      SELECT COUNT(*) FROM project_preorders
      WHERE project_id = COALESCE(OLD.project_id, NEW.project_id) AND current_status IN ('active', 'committed')
    ) WHERE id = COALESCE(OLD.project_id, NEW.project_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_preorder_count ON project_preorders;
CREATE TRIGGER trg_preorder_count
  AFTER INSERT OR UPDATE OR DELETE ON project_preorders
  FOR EACH ROW EXECUTE FUNCTION update_project_preorder_count();

-- ---------------------------------------------------------------------------
-- 17. Trigger: auto-update like_count_cache
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_project_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET like_count_cache = like_count_cache + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET like_count_cache = GREATEST(like_count_cache - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_project_like_count ON project_likes;
CREATE TRIGGER trg_project_like_count
  AFTER INSERT OR DELETE ON project_likes
  FOR EACH ROW EXECUTE FUNCTION update_project_like_count();

-- ---------------------------------------------------------------------------
-- 18. Trigger: auto-update discussion_count_cache
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_project_discussion_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET discussion_count_cache = discussion_count_cache + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET discussion_count_cache = GREATEST(discussion_count_cache - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_project_discussion_count ON project_discussion_posts;
CREATE TRIGGER trg_project_discussion_count
  AFTER INSERT OR DELETE ON project_discussion_posts
  FOR EACH ROW EXECUTE FUNCTION update_project_discussion_count();

-- ---------------------------------------------------------------------------
-- 19. Trigger: auto-update upvote_count_cache on discussion posts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_discussion_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE project_discussion_posts SET upvote_count_cache = upvote_count_cache + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE project_discussion_posts SET upvote_count_cache = GREATEST(upvote_count_cache - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_discussion_upvote_count ON project_discussion_upvotes;
CREATE TRIGGER trg_discussion_upvote_count
  AFTER INSERT OR DELETE ON project_discussion_upvotes
  FOR EACH ROW EXECUTE FUNCTION update_discussion_upvote_count();

-- ---------------------------------------------------------------------------
-- 20. RPC: Atomic preorder count check + project unlock
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_and_unlock_project(p_project_id uuid)
RETURNS boolean AS $$
DECLARE
  v_count integer;
  v_target integer;
  v_status project_lifecycle_status;
  v_production_window integer;
BEGIN
  SELECT preorder_count_cache, unlock_target, lifecycle_status, production_window_days
  INTO v_count, v_target, v_status, v_production_window
  FROM projects WHERE id = p_project_id FOR UPDATE;

  IF v_status != 'unlocking' THEN
    RETURN false;
  END IF;

  IF v_count >= v_target THEN
    UPDATE projects SET
      lifecycle_status = 'in_production',
      unlocked_at = now(),
      estimated_delivery_at = now() + (v_production_window || ' days')::interval,
      updated_at = now()
    WHERE id = p_project_id;

    -- Mark all active preorders as committed
    UPDATE project_preorders
    SET current_status = 'committed'
    WHERE project_id = p_project_id AND current_status = 'active';

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 21. RPC: Calculate and create payout releases for a project
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_payout_releases(p_project_id uuid)
RETURNS void AS $$
DECLARE
  v_total_revenue integer;
  v_platform_fee integer;
  v_creator_share integer;
  v_release1 integer;
  v_release2 integer;
  v_release3 integer;
BEGIN
  -- Calculate total revenue from committed/active preorders
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_revenue
  FROM project_preorders
  WHERE project_id = p_project_id AND current_status IN ('active', 'committed');

  -- 20% platform fee (configurable later)
  v_platform_fee := (v_total_revenue * 20) / 100;
  v_creator_share := v_total_revenue - v_platform_fee;

  -- 30/30/40 split
  v_release1 := (v_creator_share * 30) / 100;
  v_release2 := (v_creator_share * 30) / 100;
  v_release3 := v_creator_share - v_release1 - v_release2;

  -- Insert the 3 releases
  INSERT INTO project_payout_releases (project_id, release_type, amount_cents, status, available_at)
  VALUES
    (p_project_id, 'unlock', v_release1, 'available', now()),
    (p_project_id, 'progress_proof', v_release2, 'pending', NULL),
    (p_project_id, 'delivery', v_release3, 'pending', NULL);

  -- Record platform fee event
  INSERT INTO project_financial_events (project_id, event_type, amount_cents)
  VALUES (p_project_id, 'platform_fee', v_platform_fee);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 22. Trigger: updated_at on projects
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_projects_updated_at();
