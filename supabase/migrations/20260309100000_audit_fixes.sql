-- =============================================================================
-- Audit fixes: per-project balance release, threshold corrections
-- Date: March 9, 2026
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Replace global release_held_balance with per-project version
--    Old: moved ALL held → available (multi-project bug)
--    New: accepts p_amount, moves exactly that from held → available
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION release_held_balance(p_profile_id UUID, p_amount INT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_release INT;
  v_held INT;
BEGIN
  -- Lock the row
  SELECT held_balance_cents INTO v_held
  FROM profiles WHERE id = p_profile_id FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- If no amount specified, release everything (backward compat)
  IF p_amount IS NULL THEN
    v_release := v_held;
  ELSE
    v_release := LEAST(p_amount, v_held);
  END IF;

  IF v_release <= 0 THEN RETURN; END IF;

  UPDATE profiles
  SET available_balance_cents = available_balance_cents + v_release,
      held_balance_cents = held_balance_cents - v_release,
      delivered_project_count = delivered_project_count + 1
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
