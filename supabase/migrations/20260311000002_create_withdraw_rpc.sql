-- Recreate atomic_withdraw with SECURITY DEFINER + service_role guard.
CREATE FUNCTION atomic_withdraw(p_profile_id UUID, p_amount INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles
  SET available_balance_cents = available_balance_cents - p_amount
  WHERE id = p_profile_id AND available_balance_cents >= p_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;
END;
$$;
