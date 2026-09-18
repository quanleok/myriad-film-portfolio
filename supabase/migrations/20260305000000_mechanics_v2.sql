-- =============================================================================
-- Mechanics v2: Simplified payouts, manual greenlight, post-release sales
-- Date: March 5, 2026
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Widen preorder price range ($3–$100, was $3–$15)
-- ---------------------------------------------------------------------------

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_preorder_price_cents_check;
ALTER TABLE projects
  ADD CONSTRAINT projects_preorder_price_cents_check
  CHECK (preorder_price_cents IS NULL OR (preorder_price_cents >= 300 AND preorder_price_cents <= 10000));

-- Also widen purchase_price_cents (from release_option migration)
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_purchase_price_cents_check;
ALTER TABLE projects
  ADD CONSTRAINT projects_purchase_price_cents_check
  CHECK (purchase_price_cents IS NULL OR (purchase_price_cents >= 300 AND purchase_price_cents <= 20000));

-- ---------------------------------------------------------------------------
-- 2. New columns on projects
-- ---------------------------------------------------------------------------

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS release_price_cents integer,
  ADD COLUMN IF NOT EXISTS greenlit_at timestamptz,
  ADD COLUMN IF NOT EXISTS greenlit_by text,
  ADD COLUMN IF NOT EXISTS delivery_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS manual_greenlight_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorders_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_overdue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premiere_date timestamptz;

-- Constraints
ALTER TABLE projects
  ADD CONSTRAINT projects_release_price_cents_check
  CHECK (release_price_cents IS NULL OR (release_price_cents >= 300 AND release_price_cents <= 20000));

ALTER TABLE projects
  ADD CONSTRAINT projects_greenlit_by_check
  CHECK (greenlit_by IS NULL OR greenlit_by IN ('auto', 'manual'));

ALTER TABLE projects
  ADD CONSTRAINT projects_release_gte_preorder_check
  CHECK (
    release_price_cents IS NULL
    OR preorder_price_cents IS NULL
    OR release_price_cents >= preorder_price_cents
  );

-- Index for grace period cron queries
CREATE INDEX IF NOT EXISTS idx_projects_grace_period
  ON projects(grace_period_end)
  WHERE lifecycle_status = 'in_production' AND is_overdue = false;

-- Index for manual greenlight queries
CREATE INDEX IF NOT EXISTS idx_projects_manual_greenlight
  ON projects(campaign_ends_at)
  WHERE lifecycle_status = 'unlocking' AND manual_greenlight_eligible = true;

-- ---------------------------------------------------------------------------
-- 3. New columns on profiles
-- ---------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS delivered_project_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_balance_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_balance_cents integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 4. Post-release purchases table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS post_release_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  payment_intent_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE post_release_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON post_release_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert purchases"
  ON post_release_purchases FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_post_release_purchases_user
  ON post_release_purchases(user_id);

CREATE INDEX IF NOT EXISTS idx_post_release_purchases_project
  ON post_release_purchases(project_id);

-- ---------------------------------------------------------------------------
-- 5. Update check_and_unlock_project RPC (set greenlit fields)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_and_unlock_project(p_project_id uuid)
RETURNS boolean AS $$
DECLARE
  v_count integer;
  v_target integer;
  v_status project_lifecycle_status;
  v_production_window integer;
  v_now timestamptz := now();
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
      unlocked_at = v_now,
      greenlit_at = v_now,
      greenlit_by = 'auto',
      delivery_deadline = v_now + (v_production_window || ' days')::interval,
      grace_period_end = v_now + ((v_production_window + 14) || ' days')::interval,
      estimated_delivery_at = v_now + (v_production_window || ' days')::interval,
      updated_at = v_now
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
-- 6. Manual greenlight RPC (for 50–99% projects)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION manual_greenlight_project(p_project_id uuid)
RETURNS boolean AS $$
DECLARE
  v_status project_lifecycle_status;
  v_eligible boolean;
  v_production_window integer;
  v_now timestamptz := now();
BEGIN
  SELECT lifecycle_status, manual_greenlight_eligible, production_window_days
  INTO v_status, v_eligible, v_production_window
  FROM projects WHERE id = p_project_id FOR UPDATE;

  IF v_status != 'unlocking' OR NOT v_eligible THEN
    RETURN false;
  END IF;

  UPDATE projects SET
    lifecycle_status = 'in_production',
    unlocked_at = v_now,
    greenlit_at = v_now,
    greenlit_by = 'manual',
    delivery_deadline = v_now + (v_production_window || ' days')::interval,
    grace_period_end = v_now + ((v_production_window + 14) || ' days')::interval,
    estimated_delivery_at = v_now + (v_production_window || ' days')::interval,
    manual_greenlight_eligible = false,
    updated_at = v_now
  WHERE id = p_project_id;

  UPDATE project_preorders
  SET current_status = 'committed'
  WHERE project_id = p_project_id AND current_status = 'active';

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 7. Credit creator balance RPC (replaces create_payout_releases)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION credit_creator_balance(
  p_project_id uuid,
  p_creator_id uuid
) RETURNS void AS $$
DECLARE
  v_total_revenue integer;
  v_platform_fee integer;
  v_creator_share integer;
  v_is_proven boolean;
  v_available integer;
  v_held integer;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_total_revenue
  FROM project_preorders
  WHERE project_id = p_project_id AND current_status IN ('active', 'committed');

  v_platform_fee := (v_total_revenue * 20) / 100;
  v_creator_share := v_total_revenue - v_platform_fee;

  SELECT (delivered_project_count >= 1)
  INTO v_is_proven
  FROM profiles WHERE id = p_creator_id;

  IF v_is_proven THEN
    v_available := (v_creator_share * 70) / 100;
    v_held := v_creator_share - v_available;
  ELSE
    v_available := 0;
    v_held := v_creator_share;
  END IF;

  UPDATE profiles SET
    available_balance_cents = available_balance_cents + v_available,
    held_balance_cents = held_balance_cents + v_held
  WHERE id = p_creator_id;

  -- Record platform fee event
  INSERT INTO project_financial_events (project_id, event_type, amount_cents, metadata_json)
  VALUES (p_project_id, 'platform_fee', v_platform_fee, jsonb_build_object(
    'total_revenue', v_total_revenue,
    'creator_share', v_creator_share,
    'available', v_available,
    'held', v_held,
    'is_proven', v_is_proven
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 8. Balance helper RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_available_balance(p_profile_id uuid, p_amount integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET available_balance_cents = available_balance_cents + p_amount
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_available_balance(p_profile_id uuid, p_amount integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET available_balance_cents = available_balance_cents - p_amount
  WHERE id = p_profile_id
    AND available_balance_cents >= p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release held balance to available (on delivery)
CREATE OR REPLACE FUNCTION release_held_balance(p_profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    available_balance_cents = available_balance_cents + held_balance_cents,
    held_balance_cents = 0,
    delivered_project_count = delivered_project_count + 1
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_strike_count(p_profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET strike_count = strike_count + 1
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 9. Update viewer_has_access to also check post_release_purchases
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION viewer_has_access(p_viewer_id UUID, p_video_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_video RECORD;
BEGIN
  SELECT pricing_model, creator_id INTO v_video FROM videos WHERE id = p_video_id;

  -- Free videos are always accessible
  IF v_video.pricing_model = 'free' THEN RETURN TRUE; END IF;

  -- Check project entitlement (preorder backers)
  IF EXISTS (
    SELECT 1 FROM project_entitlements
    WHERE user_id = p_viewer_id AND video_id = p_video_id
  ) THEN RETURN TRUE; END IF;

  -- Check post-release purchase
  IF EXISTS (
    SELECT 1 FROM post_release_purchases prp
    JOIN projects p ON p.id = prp.project_id
    WHERE prp.user_id = p_viewer_id AND p.film_video_id = p_video_id
  ) THEN RETURN TRUE; END IF;

  -- Check per-video purchase (legacy)
  IF EXISTS (
    SELECT 1 FROM purchases
    WHERE viewer_id = p_viewer_id AND video_id = p_video_id AND payment_status = 'completed'
  ) THEN RETURN TRUE; END IF;

  -- Check active subscription to creator (legacy)
  IF EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriber_id = p_viewer_id AND creator_id = v_video.creator_id AND is_active = TRUE
  ) THEN RETURN TRUE; END IF;

  -- Check bundle purchases (legacy)
  IF EXISTS (
    SELECT 1 FROM bundle_purchases bp
    JOIN bundle_items bi ON bi.bundle_id = bp.bundle_id
    WHERE bp.viewer_id = p_viewer_id
      AND bi.video_id = p_video_id
      AND bp.payment_status = 'completed'
  ) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
