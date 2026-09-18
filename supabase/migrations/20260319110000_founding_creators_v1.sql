ALTER TABLE invite_codes
ADD COLUMN IF NOT EXISTS program TEXT NOT NULL DEFAULT 'general'
CHECK (program IN ('general', 'founding_creator'));

CREATE INDEX IF NOT EXISTS idx_invite_codes_program ON invite_codes(program);

ALTER TABLE founding_applications
ALTER COLUMN invite_code DROP NOT NULL;
