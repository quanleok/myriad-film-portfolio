CREATE OR REPLACE FUNCTION release_held_balance(p_profile_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles
  SET available_balance_cents = available_balance_cents + held_balance_cents,
      held_balance_cents = 0,
      delivered_project_count = delivered_project_count + 1
  WHERE id = p_profile_id;
END;
$$;
