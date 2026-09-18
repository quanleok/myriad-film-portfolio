-- Add balance tracking to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS balance_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earnings_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- Create payouts table for withdrawal history
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  platform_fee_cents integer NOT NULL DEFAULT 0,
  stripe_transfer_id text,
  payout_status text NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_creator ON payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(payout_status);

-- RLS for payouts
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payouts"
  ON payouts FOR SELECT
  USING (creator_id = auth.uid());

-- Atomic balance increment to prevent race conditions
CREATE OR REPLACE FUNCTION increment_balance(profile_id uuid, amount integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    balance_cents = balance_cents + amount,
    total_earnings_cents = total_earnings_cents + amount
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic balance decrement for withdrawals
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
