-- =============================================================================
-- Pre-launch audit critical fixes
-- Creates: tips table, processed_webhook_events table
-- Fixes: bundle_purchases conflict key, RLS hardening
-- =============================================================================

-- 1. Tips table (was missing — webhook tried to write to non-existent table)
CREATE TABLE IF NOT EXISTS tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipper_id UUID NOT NULL REFERENCES auth.users(id),
  creator_id UUID NOT NULL REFERENCES profiles(id),
  video_id UUID REFERENCES videos(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 100 AND amount_cents <= 20000),
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  creator_earnings_cents INTEGER NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Tippers can see their own tips
DO $$ BEGIN
  CREATE POLICY "Users can view own sent tips" ON tips FOR SELECT USING (auth.uid() = tipper_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Creators can see tips they received
DO $$ BEGIN
  CREATE POLICY "Creators can view received tips" ON tips FOR SELECT USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only webhook (service role) can insert/update/delete
DO $$ BEGIN
  CREATE POLICY "No manual insert on tips" ON tips FOR INSERT WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "No updates on tips" ON tips FOR UPDATE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "No deletes on tips" ON tips FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Processed webhook events (deduplication table)
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- No client access — only service role (admin client) writes/reads
DO $$ BEGIN
  CREATE POLICY "No client access to webhook events" ON processed_webhook_events FOR ALL USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Ensure bundle_purchases has UNIQUE on stripe_payment_intent_id
DO $$ BEGIN
  ALTER TABLE bundle_purchases ADD CONSTRAINT bundle_purchases_stripe_pi_unique
    UNIQUE (stripe_payment_intent_id);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- 4. RLS hardening — prevent deletes on video_views
DO $$ BEGIN
  CREATE POLICY "No deletes on video_views" ON video_views FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;

-- Prevent modifying purchase records
DO $$ BEGIN
  CREATE POLICY "No updates on purchases" ON purchases FOR UPDATE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "No deletes on purchases" ON purchases FOR DELETE USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Let users delete their own premiere chat messages
DO $$ BEGIN
  CREATE POLICY "Users can delete own premiere messages" ON premiere_chats FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
