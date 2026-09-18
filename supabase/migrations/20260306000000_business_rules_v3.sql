-- =============================================================================
-- Business Rules v3: Dispute handling, refund fee tracking, threshold changes
-- Date: March 6, 2026
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add dispute-related columns to profiles
-- ---------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_dispute_flagged boolean NOT NULL DEFAULT false;

-- Note: dispute_count and account_frozen already added by business_rules_v3_admin migration
-- Drop is_frozen if it was accidentally created (conflicting name)
ALTER TABLE profiles DROP COLUMN IF EXISTS is_frozen;

-- ---------------------------------------------------------------------------
-- 2. Add new financial event types for refund fee tracking and disputes
-- ---------------------------------------------------------------------------

ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'platform_fee_absorbed';
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'dispute_chargeback';
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'late_preorder_credit';
ALTER TYPE financial_event_type ADD VALUE IF NOT EXISTS 'post_release_sale';

-- ---------------------------------------------------------------------------
-- 3. Credit late preorder RPC
--    Same as credit_creator_balance but for a single preorder during in_production
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION credit_late_preorder(
  p_project_id uuid,
  p_creator_id uuid,
  p_amount_cents integer
) RETURNS void AS $$
DECLARE
  v_platform_fee integer;
  v_creator_share integer;
  v_is_proven boolean;
  v_available integer;
  v_held integer;
BEGIN
  v_platform_fee := (p_amount_cents * 20) / 100;
  v_creator_share := p_amount_cents - v_platform_fee;

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
    'source', 'late_preorder',
    'total_amount', p_amount_cents,
    'creator_share', v_creator_share,
    'available', v_available,
    'held', v_held,
    'is_proven', v_is_proven
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 4. Update greenlight threshold from 50% to 25%
--    (This is handled in application code, not SQL — noted here for reference)
-- ---------------------------------------------------------------------------

-- Campaign deadline cron: auto-fail below 25% (was 50%)
-- Manual greenlight: only in last 7 days of campaign
-- These changes are in the API routes, not database level.

-- ---------------------------------------------------------------------------
-- 5. Atomic dispute increment RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_dispute_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE profiles SET
    dispute_count = dispute_count + 1,
    is_dispute_flagged = true,
    account_frozen = CASE WHEN dispute_count + 1 >= 2 THEN true ELSE account_frozen END
  WHERE id = p_user_id
  RETURNING dispute_count INTO v_new_count;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
