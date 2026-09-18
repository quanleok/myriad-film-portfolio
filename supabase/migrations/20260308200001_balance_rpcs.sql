-- Add increment_held_balance RPC for direct launch mode payout logic
CREATE OR REPLACE FUNCTION increment_held_balance(p_profile_id UUID, p_amount INT)
RETURNS void AS $$
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE profiles SET held_balance_cents = held_balance_cents + p_amount WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement held balance with floor at 0 (silent no-op if insufficient)
CREATE OR REPLACE FUNCTION decrement_held_balance(p_profile_id UUID, p_amount INT)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  IF p_amount <= 0 THEN RETURN FALSE; END IF;

  UPDATE profiles
  SET held_balance_cents = held_balance_cents - p_amount
  WHERE id = p_profile_id
    AND held_balance_cents >= p_amount;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TASK 1: Atomic withdrawal — checks balance and debits in one transaction
-- Prevents race condition where two concurrent withdrawals both pass the balance check
CREATE OR REPLACE FUNCTION atomic_withdraw(p_profile_id UUID, p_amount INT)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  UPDATE profiles
  SET available_balance_cents = available_balance_cents - p_amount
  WHERE id = p_profile_id
    AND available_balance_cents >= p_amount;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TASK 3: Atomic dispute debit — debits available first, then held, with floor at 0
-- Prevents TOCTOU race on dispute chargebacks
CREATE OR REPLACE FUNCTION atomic_dispute_debit(p_profile_id UUID, p_amount INT)
RETURNS void AS $$
DECLARE
  v_available INT;
  v_held INT;
  v_from_available INT;
  v_from_held INT;
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;

  -- Lock the row to prevent concurrent modifications
  SELECT available_balance_cents, held_balance_cents
  INTO v_available, v_held
  FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- Debit from available first, then held
  v_from_available := LEAST(p_amount, v_available);
  v_from_held := LEAST(p_amount - v_from_available, v_held);

  UPDATE profiles
  SET available_balance_cents = available_balance_cents - v_from_available,
      held_balance_cents = held_balance_cents - v_from_held
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
