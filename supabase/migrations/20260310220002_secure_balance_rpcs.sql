-- Add auth.role() checks to balance SECURITY DEFINER RPCs

CREATE OR REPLACE FUNCTION increment_available_balance(p_profile_id UUID, p_amount INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles SET available_balance_cents = available_balance_cents + p_amount WHERE id = p_profile_id;
END;
$$;
