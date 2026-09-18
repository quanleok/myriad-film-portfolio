CREATE OR REPLACE FUNCTION increment_held_balance(p_profile_id UUID, p_amount INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles SET held_balance_cents = held_balance_cents + p_amount WHERE id = p_profile_id;
END;
$$;
