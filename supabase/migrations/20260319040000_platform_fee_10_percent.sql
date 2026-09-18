-- Update platform fee from 20% to 10% in all payout RPCs.

-- Recreate credit_creator_balance with 10% fee
CREATE OR REPLACE FUNCTION credit_creator_balance(p_project_id UUID, p_creator_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  total_preorder_cents BIGINT;
  platform_fee_cents BIGINT;
  creator_share BIGINT;
  is_proven BOOLEAN;
  available_portion BIGINT;
  held_portion BIGINT;
  already_credited BOOLEAN;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Idempotency: skip if already credited for this project
  SELECT EXISTS(
    SELECT 1 FROM project_financial_events
    WHERE project_id = p_project_id AND event_type = 'platform_fee'
  ) INTO already_credited;

  IF already_credited THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount_cents), 0) INTO total_preorder_cents
  FROM project_preorders
  WHERE project_id = p_project_id AND current_status IN ('active', 'committed');

  platform_fee_cents := FLOOR(total_preorder_cents * 0.10);
  creator_share := total_preorder_cents - platform_fee_cents;

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

  -- Record the platform fee event (also serves as the idempotency marker)
  INSERT INTO project_financial_events (project_id, event_type, amount_cents, metadata_json)
  VALUES (p_project_id, 'platform_fee', platform_fee_cents,
    jsonb_build_object(
      'total_preorder_cents', total_preorder_cents,
      'creator_share', creator_share,
      'available', available_portion,
      'held', held_portion,
      'is_proven', is_proven
    )
  );
END;
$$;

-- Recreate credit_late_preorder with 10% fee
CREATE OR REPLACE FUNCTION credit_late_preorder(p_project_id UUID, p_creator_id UUID, p_amount_cents INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  platform_fee_cents INT;
  creator_share INT;
  is_proven BOOLEAN;
  available_portion INT;
  held_portion INT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  platform_fee_cents := FLOOR(p_amount_cents * 0.10);
  creator_share := p_amount_cents - platform_fee_cents;
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

  -- Record platform_fee event so delivery route can find held amounts
  INSERT INTO project_financial_events (project_id, event_type, amount_cents, metadata_json)
  VALUES (p_project_id, 'platform_fee', platform_fee_cents,
    jsonb_build_object(
      'total_amount', p_amount_cents,
      'creator_share', creator_share,
      'available', available_portion,
      'held', held_portion,
      'is_proven', is_proven,
      'source', 'late_preorder'
    )
  );
END;
$$;
