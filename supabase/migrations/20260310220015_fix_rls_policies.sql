-- Fix policies that use current_setting('request.jwt.claim.role') instead of auth.role()

-- project_preorders
DROP POLICY IF EXISTS "Service role can insert preorders" ON project_preorders;
CREATE POLICY "Service role can insert preorders"
  ON project_preorders FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update preorders" ON project_preorders;
CREATE POLICY "Service role can update preorders"
  ON project_preorders FOR UPDATE
  USING (auth.role() = 'service_role');

-- project_entitlements
DROP POLICY IF EXISTS "Service role can manage entitlements" ON project_entitlements;
CREATE POLICY "Service role can manage entitlements"
  ON project_entitlements FOR ALL
  USING (auth.role() = 'service_role');

-- project_payout_releases
DROP POLICY IF EXISTS "Service role can manage payout releases" ON project_payout_releases;
CREATE POLICY "Service role can manage payout releases"
  ON project_payout_releases FOR ALL
  USING (auth.role() = 'service_role');

-- project_status_history
DROP POLICY IF EXISTS "Service role can insert status history" ON project_status_history;
CREATE POLICY "Service role can insert status history"
  ON project_status_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- project_financial_events
DROP POLICY IF EXISTS "Service role can manage financial events" ON project_financial_events;
CREATE POLICY "Service role can manage financial events"
  ON project_financial_events FOR ALL
  USING (auth.role() = 'service_role');
