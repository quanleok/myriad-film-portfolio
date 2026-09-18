-- Recreate decrement_held_balance with SECURITY DEFINER + service_role guard.
CREATE FUNCTION decrement_held_balance(p_profile_id UUID, p_amount INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles SET held_balance_cents = GREATEST(0, held_balance_cents - p_amount) WHERE id = p_profile_id;
END;
$$;
