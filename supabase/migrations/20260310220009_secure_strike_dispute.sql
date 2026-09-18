-- Must DROP first because original has different return type (void) and param name (p_profile_id)
DROP FUNCTION IF EXISTS increment_strike_count(uuid);

CREATE OR REPLACE FUNCTION increment_strike_count(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_count INT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles SET strike_count = COALESCE(strike_count, 0) + 1 WHERE id = p_user_id
  RETURNING strike_count INTO new_count;
  RETURN new_count;
END;
$$;
