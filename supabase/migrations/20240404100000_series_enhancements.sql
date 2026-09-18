-- Series enhancements: cover image, pricing model, total views, tags
ALTER TABLE series ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE series ADD COLUMN IF NOT EXISTS pricing_model text
  DEFAULT 'mixed' CHECK (pricing_model IN ('free', 'premium', 'mixed'));
ALTER TABLE series ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0;

-- tags column already exists on series table from initial schema
-- Just ensure it has a default
ALTER TABLE series ALTER COLUMN tags SET DEFAULT '{}';
