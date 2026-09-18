-- Recreate release_held_balance 2-arg with service_role guard.
CREATE FUNCTION release_held_balance(p_profile_id UUID, p_amount INT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_amount IS NOT NULL THEN
    UPDATE profiles
    SET available_balance_cents = available_balance_cents + p_amount,
        held_balance_cents = GREATEST(0, held_balance_cents - p_amount)
    WHERE id = p_profile_id;
  ELSE
    UPDATE profiles
    SET available_balance_cents = available_balance_cents + held_balance_cents,
        held_balance_cents = 0,
        delivered_project_count = delivered_project_count + 1
    WHERE id = p_profile_id;
  END IF;
END;
$$;
