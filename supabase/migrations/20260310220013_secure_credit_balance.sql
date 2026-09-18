CREATE OR REPLACE FUNCTION credit_creator_balance(p_project_id UUID, p_creator_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  total_preorder_cents BIGINT;
  platform_fee BIGINT;
  creator_share BIGINT;
  is_proven BOOLEAN;
  available_portion BIGINT;
  held_portion BIGINT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COALESCE(SUM(amount_cents), 0) INTO total_preorder_cents
  FROM project_preorders
  WHERE project_id = p_project_id AND current_status IN ('active', 'committed');
  platform_fee := FLOOR(total_preorder_cents * 0.20);
  creator_share := total_preorder_cents - platform_fee;
  SELECT delivered_project_count >= 1 INTO is_proven
  FROM profiles WHERE id = p_creator_id;
  IF is_proven THEN
    available_portion := FLOOR(creator_share * 0.70);
    held_portion := creator_share - available_portion;
  ELSE
    available_portion := 0;
    held_portion := creator_share;
  END IF;
  UPDATE profiles
  SET available_balance_cents = available_balance_cents + available_portion,
      held_balance_cents = held_balance_cents + held_portion
  WHERE id = p_creator_id;
END;
$$;
