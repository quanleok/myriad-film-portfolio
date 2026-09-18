CREATE OR REPLACE FUNCTION decrement_balance(profile_id uuid, amount integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET balance_cents = balance_cents - amount
  WHERE id = profile_id AND balance_cents >= amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
