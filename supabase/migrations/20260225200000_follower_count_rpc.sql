-- =============================================================================
-- Atomic follower count increment/decrement to prevent race conditions
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_follower_count(profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET follower_count = follower_count + 1
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_follower_count(profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET follower_count = GREATEST(0, follower_count - 1)
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
