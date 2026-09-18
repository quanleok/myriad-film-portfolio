-- Tutorials table
CREATE TABLE tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  body TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  video_id TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents = 0 OR (price_cents >= 100 AND price_cents <= 5000)),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tutorial purchases table
CREATE TABLE tutorial_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES tutorials(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  payment_intent_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tutorial_id, user_id)
);

-- Indexes
CREATE INDEX idx_tutorials_creator ON tutorials(creator_id);
CREATE INDEX idx_tutorials_published ON tutorials(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_tutorial_purchases_user ON tutorial_purchases(user_id);
CREATE INDEX idx_tutorial_purchases_tutorial ON tutorial_purchases(tutorial_id);

-- FK from tutorial_purchases to profiles for joins
ALTER TABLE tutorial_purchases
  ADD CONSTRAINT tutorial_purchases_profile_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id);

-- RLS
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_purchases ENABLE ROW LEVEL SECURITY;

-- Everyone can read published tutorials
CREATE POLICY "tutorials_select" ON tutorials FOR SELECT
  USING (published_at IS NOT NULL OR creator_id = auth.uid());

-- Authenticated users can create
CREATE POLICY "tutorials_insert" ON tutorials FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators can update own
CREATE POLICY "tutorials_update" ON tutorials FOR UPDATE
  USING (auth.uid() = creator_id);

-- Creators can delete own
CREATE POLICY "tutorials_delete" ON tutorials FOR DELETE
  USING (auth.uid() = creator_id);

-- Users can see own purchases
CREATE POLICY "tutorial_purchases_select" ON tutorial_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Storage bucket for tutorial thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-thumbnails', 'tutorial-thumbnails', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "tutorial_thumbnails_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'tutorial-thumbnails');

CREATE POLICY "tutorial_thumbnails_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tutorial-thumbnails' AND auth.role() = 'authenticated');
