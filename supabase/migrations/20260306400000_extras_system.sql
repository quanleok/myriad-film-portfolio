-- Extras content table
CREATE TABLE IF NOT EXISTS project_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 100),
  description text CHECK (char_length(description) <= 500),
  media_asset_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  access_level text NOT NULL DEFAULT 'free' CHECK (access_level IN ('free', 'free_for_backers', 'paid')),
  price_cents integer CHECK (
    (access_level != 'paid') OR (price_cents >= 100 AND price_cents <= 5000)
  ),
  is_published boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Extra purchases table
CREATE TABLE IF NOT EXISTS project_extra_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extra_id uuid NOT NULL REFERENCES project_extras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  payment_intent_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(extra_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extras_project_id ON project_extras(project_id);
CREATE INDEX IF NOT EXISTS idx_extras_creator_id ON project_extras(creator_id);
CREATE INDEX IF NOT EXISTS idx_extra_purchases_extra_id ON project_extra_purchases(extra_id);
CREATE INDEX IF NOT EXISTS idx_extra_purchases_user_id ON project_extra_purchases(user_id);

-- RLS (admin client bypasses, but add policies for safety)
ALTER TABLE project_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_extra_purchases ENABLE ROW LEVEL SECURITY;
