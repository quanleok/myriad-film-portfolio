CREATE OR REPLACE FUNCTION atomic_dispute_debit(p_profile_id UUID, p_amount INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  remaining INT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT available_balance_cents INTO remaining
  FROM profiles WHERE id = p_profile_id FOR UPDATE;
  IF remaining >= p_amount THEN
    UPDATE profiles SET available_balance_cents = available_balance_cents - p_amount WHERE id = p_profile_id;
  ELSE
    UPDATE profiles SET
      available_balance_cents = 0,
      held_balance_cents = GREATEST(0, held_balance_cents - (p_amount - remaining))
    WHERE id = p_profile_id;
  END IF;
END;
$$;
