-- Fix post_release_purchases INSERT policy (was WITH CHECK(true) — allows fake purchases)
DROP POLICY IF EXISTS "Users can insert own purchases" ON post_release_purchases;
CREATE POLICY "Service role only inserts purchases"
  ON post_release_purchases FOR INSERT
  WITH CHECK (false);
