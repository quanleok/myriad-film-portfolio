-- Atomic revenue increment to prevent race conditions in concurrent webhooks.
-- Replaces the read-modify-write pattern in trackRevenue().
CREATE OR REPLACE FUNCTION increment_revenue(profile_id uuid, amount_dollars numeric)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET total_revenue_earned = total_revenue_earned + amount_dollars
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
