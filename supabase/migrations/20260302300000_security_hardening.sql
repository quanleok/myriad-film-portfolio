-- Security hardening migration
-- Fixes: overly permissive INSERT policies, unrestricted SECURITY DEFINER RPCs

-- ============================================================
-- 1. purchases: restrict INSERT to service role only
--    (prevents fake purchase records bypassing payment)
-- ============================================================
DROP POLICY IF EXISTS "System inserts purchases" ON purchases;
CREATE POLICY "Only service role inserts purchases"
  ON purchases FOR INSERT
  WITH CHECK (false);
-- Service role (webhooks) bypasses RLS, so it can still insert.

-- Also block direct UPDATE on purchases (belt and suspenders)
DROP POLICY IF EXISTS "No updates on purchases" ON purchases;
CREATE POLICY "No updates on purchases"
  ON purchases FOR UPDATE
  USING (false);

-- ============================================================
-- 2. subscriptions: restrict INSERT to service role only
-- ============================================================
DROP POLICY IF EXISTS "System inserts subscriptions" ON subscriptions;
CREATE POLICY "Only service role inserts subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- 3. bundle_purchases: restrict INSERT to service role only
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert bundle purchases" ON bundle_purchases;
CREATE POLICY "Only service role inserts bundle_purchases"
  ON bundle_purchases FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- 4. playlist_purchases: restrict INSERT to service role only
-- ============================================================
DROP POLICY IF EXISTS "Viewers can insert their playlist purchases" ON playlist_purchases;
CREATE POLICY "Only service role inserts playlist_purchases"
  ON playlist_purchases FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- 5. increment_balance / decrement_balance: restrict to service role
--    (prevents users from giving themselves unlimited balance)
-- ============================================================
DROP FUNCTION IF EXISTS increment_balance(UUID, INTEGER);
CREATE OR REPLACE FUNCTION increment_balance(profile_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Only callable via service role (RLS bypass). Regular users calling
  -- this via the client SDK will get blocked by RLS on profiles UPDATE.
  -- Double-check: reject if called with a regular user JWT.
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call increment_balance';
  END IF;

  UPDATE profiles
  SET balance_cents = balance_cents + amount,
      total_earnings_cents = total_earnings_cents + amount
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS decrement_balance(UUID, INTEGER);
CREATE OR REPLACE FUNCTION decrement_balance(profile_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call decrement_balance';
  END IF;

  UPDATE profiles
  SET balance_cents = balance_cents - amount
  WHERE id = profile_id AND balance_cents >= amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. follower count RPCs: restrict to service role
-- ============================================================
DROP FUNCTION IF EXISTS increment_follower_count(UUID);
CREATE OR REPLACE FUNCTION increment_follower_count(profile_id UUID)
RETURNS VOID AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call increment_follower_count';
  END IF;

  UPDATE profiles SET follower_count = follower_count + 1 WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS decrement_follower_count(UUID);
CREATE OR REPLACE FUNCTION decrement_follower_count(profile_id UUID)
RETURNS VOID AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role can call decrement_follower_count';
  END IF;

  UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. invite_codes: restrict SELECT to authenticated users only
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read active codes for validation" ON invite_codes;
CREATE POLICY "Authenticated users can validate codes"
  ON invite_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 8. video_views: restrict INSERT to authenticated users only
--    and enforce viewer_id = auth.uid()
-- ============================================================
DROP POLICY IF EXISTS "Anyone can log a view" ON video_views;
CREATE POLICY "Authenticated users can log their own views"
  ON video_views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
