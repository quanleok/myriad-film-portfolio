-- Atomic increment of delivered_project_count (service_role only).
-- Used by deliver route since the 2-arg release_held_balance doesn't increment it.
CREATE FUNCTION increment_delivered_count(p_profile_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles
  SET delivered_project_count = delivered_project_count + 1
  WHERE id = p_profile_id;
END;
$$;
