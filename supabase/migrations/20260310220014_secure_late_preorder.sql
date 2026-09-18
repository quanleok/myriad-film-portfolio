CREATE OR REPLACE FUNCTION credit_late_preorder(p_project_id UUID, p_creator_id UUID, p_amount_cents INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  platform_fee INT;
  creator_share INT;
  is_proven BOOLEAN;
  available_portion INT;
  held_portion INT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  platform_fee := FLOOR(p_amount_cents * 0.20);
  creator_share := p_amount_cents - platform_fee;
  SELECT delivered_project_count >= 1 INTO is_proven FROM profiles WHERE id = p_creator_id;
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
