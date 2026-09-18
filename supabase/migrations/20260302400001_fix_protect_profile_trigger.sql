-- Fix: remove stripe_customer_id reference (column is on subscriptions, not profiles)
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
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
