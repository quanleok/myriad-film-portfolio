CREATE OR REPLACE FUNCTION increment_dispute_count(p_user_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_count INT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles
  SET dispute_count = COALESCE(dispute_count, 0) + 1,
      is_flagged = true,
      is_frozen = CASE WHEN COALESCE(dispute_count, 0) + 1 >= 2 THEN true ELSE is_frozen END
  WHERE id = p_user_id
  RETURNING dispute_count INTO new_count;
  RETURN new_count;
END;
$$;
