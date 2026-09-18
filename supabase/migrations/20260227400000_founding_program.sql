ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founding_creator BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS founding_creator_approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS founding_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  portfolio_link TEXT,
  ai_tools TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE founding_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own applications" ON founding_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert applications" ON founding_applications
  FOR INSERT WITH CHECK (true);
