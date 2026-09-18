-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = true;

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active codes for validation" ON invite_codes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage invite codes" ON invite_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
