-- Fix: current_setting('request.jwt.claim.role', true) returns NULL with
-- newer Supabase key format (sb_secret_*). Use auth.role() instead which
-- correctly returns 'service_role', 'authenticated', or 'anon'.

-- 1. Fix increment_balance
CREATE OR REPLACE FUNCTION increment_balance(profile_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call increment_balance';
  END IF;

  UPDATE profiles
  SET balance_cents = balance_cents + amount,
      total_earnings_cents = total_earnings_cents + amount
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix decrement_balance
CREATE OR REPLACE FUNCTION decrement_balance(profile_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
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

-- 3. Fix increment_revenue
CREATE OR REPLACE FUNCTION increment_revenue(profile_id UUID, amount_dollars NUMERIC)
RETURNS VOID AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call increment_revenue';
  END IF;

  UPDATE profiles
  SET total_revenue_earned = total_revenue_earned + amount_dollars
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix protect_profile_columns trigger
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

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
  NEW.subscription_stripe_price_id := OLD.subscription_stripe_price_id;
  NEW.follower_count := OLD.follower_count;
  NEW.subscriber_count := OLD.subscriber_count;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Clean up debug function
DROP FUNCTION IF EXISTS debug_role_info();
