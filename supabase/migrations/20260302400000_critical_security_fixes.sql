-- Critical security fixes:
-- 1. decrement_balance: restore IF NOT FOUND check (prevents silent withdrawal bypass)
-- 2. increment_revenue: add service-role check (prevents creator level gaming)
-- 3. profiles: protect privileged columns from self-escalation via trigger
-- 4. balance_cents: add CHECK constraint to prevent negative balance

-- ============================================================
-- 1. Fix decrement_balance — add IF NOT FOUND check
--    Without this, insufficient balance silently succeeds and
--    the withdraw route sends real money without decrementing.
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_balance(profile_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call decrement_balance';
  END IF;

  UPDATE profiles
  SET balance_cents = balance_cents - amount
  WHERE id = profile_id AND balance_cents >= amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Fix increment_revenue — add service-role check
--    Without this, any authenticated user can inflate their
--    total_revenue_earned to game creator levels (lower fees).
-- ============================================================
CREATE OR REPLACE FUNCTION increment_revenue(profile_id UUID, amount_dollars NUMERIC)
RETURNS VOID AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call increment_revenue';
  END IF;

  UPDATE profiles
  SET total_revenue_earned = total_revenue_earned + amount_dollars
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Protect privileged profile columns from self-escalation
--    The profiles UPDATE RLS policy is (auth.uid() = id) with
--    no column restrictions. This trigger reverts changes to
--    privileged columns for non-service-role callers.
-- ============================================================
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role (admin client, webhooks) can update any column
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For regular users, revert changes to privileged columns
  NEW.is_admin := OLD.is_admin;
  NEW.is_banned := OLD.is_banned;
  NEW.is_creator := OLD.is_creator;
  NEW.balance_cents := OLD.balance_cents;
  NEW.total_earnings_cents := OLD.total_earnings_cents;
  NEW.total_revenue_earned := OLD.total_revenue_earned;
  NEW.star_level := OLD.star_level;
  NEW.xp_points := OLD.xp_points;
  NEW.stripe_account_id := OLD.stripe_account_id;
  NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.subscription_stripe_price_id := OLD.subscription_stripe_price_id;
  NEW.follower_count := OLD.follower_count;
  NEW.subscriber_count := OLD.subscriber_count;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_columns_trigger ON profiles;
CREATE TRIGGER protect_profile_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_columns();

-- ============================================================
-- 4. Add CHECK constraint to prevent negative balance
-- ============================================================
ALTER TABLE profiles
  ADD CONSTRAINT balance_non_negative CHECK (balance_cents >= 0);
