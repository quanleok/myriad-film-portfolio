-- Blog posts table for platform editorial content
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  media JSONB DEFAULT '[]'::jsonb,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public read published blog posts"
  ON blog_posts FOR SELECT
  USING (is_published = true);

-- Only service_role can insert/update/delete (admin client)
CREATE POLICY "Service role full access to blog posts"
  ON blog_posts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for homepage query
CREATE INDEX idx_blog_posts_published ON blog_posts (is_published, published_at DESC);
CREATE INDEX idx_blog_posts_pinned ON blog_posts (is_pinned) WHERE is_published = true;
