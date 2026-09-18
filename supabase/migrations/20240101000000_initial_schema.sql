-- ============================================================
-- MYRIAD PLATFORM — Initial Database Schema
-- Supabase (PostgreSQL) with Row Level Security
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('viewer', 'creator', 'admin');
CREATE TYPE content_type AS ENUM ('movie', 'music_video', 'series', 'episode');
CREATE TYPE pricing_model AS ENUM ('free', 'per_video', 'subscription');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE genre AS ENUM (
  'sci_fi', 'anime', 'horror', 'romance', 'thriller', 'comedy',
  'drama', 'experimental', 'documentary', 'fantasy', 'action', 'mystery'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  social_links JSONB DEFAULT '{}',
  -- Creator-specific fields
  is_creator BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_account_id TEXT,           -- Stripe Connect account ID
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  -- Subscription pricing (if creator offers subscriptions)
  subscription_price_cents INTEGER,  -- $3–$10/mo in cents (300–1000)
  subscription_stripe_price_id TEXT, -- Stripe Price ID for subscription
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_is_creator ON profiles(is_creator) WHERE is_creator = TRUE;
CREATE INDEX idx_profiles_stripe_account ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- ============================================================
-- SERIES (groups episodes together)
-- ============================================================

CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  genre genre NOT NULL,
  tags TEXT[] DEFAULT '{}',
  season_count INTEGER NOT NULL DEFAULT 1,
  episode_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_series_creator ON series(creator_id);
CREATE INDEX idx_series_genre ON series(genre);

-- ============================================================
-- VIDEOS (core content table)
-- ============================================================

CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content info
  title TEXT NOT NULL,
  description TEXT,
  content_type content_type NOT NULL,
  genre genre NOT NULL,
  tags TEXT[] DEFAULT '{}',
  duration_seconds INTEGER,          -- Video length
  thumbnail_url TEXT,

  -- Series/episode info (only for episodes)
  series_id UUID REFERENCES series(id) ON DELETE SET NULL,
  season_number INTEGER,
  episode_number INTEGER,

  -- Video hosting (Bunny.net Stream)
  bunny_video_id TEXT,               -- Bunny.net video GUID
  bunny_library_id TEXT,             -- Bunny.net library ID
  video_url TEXT,                    -- Direct HLS URL (for generating signed URLs)
  youtube_url TEXT,                  -- Optional YouTube embed for free content
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,  -- Bunny encoding complete

  -- Pricing
  pricing_model pricing_model NOT NULL DEFAULT 'free',
  price_cents INTEGER,               -- Per-video price in cents (100–500)

  -- Free preview
  preview_type TEXT DEFAULT 'first_minutes',  -- 'first_minutes', 'trailer', 'full'
  preview_seconds INTEGER DEFAULT 180,        -- How many seconds are free (default 3 min)
  preview_video_id TEXT,                      -- Separate trailer video ID (if trailer type)

  -- Stats (denormalized for performance)
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,

  -- Premiere
  premiere_scheduled_at TIMESTAMPTZ, -- If set, video premieres at this time
  is_premiere_live BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_videos_creator ON videos(creator_id);
CREATE INDEX idx_videos_genre ON videos(genre);
CREATE INDEX idx_videos_content_type ON videos(content_type);
CREATE INDEX idx_videos_series ON videos(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_videos_published ON videos(is_published, published_at DESC) WHERE is_published = TRUE;
CREATE INDEX idx_videos_trending ON videos(is_published, view_count DESC, like_count DESC) WHERE is_published = TRUE;
CREATE INDEX idx_videos_featured ON videos(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_videos_pricing ON videos(pricing_model);

-- ============================================================
-- PURCHASES (per-video unlocks)
-- ============================================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id),

  -- Payment details
  amount_cents INTEGER NOT NULL,         -- Total paid
  platform_fee_cents INTEGER NOT NULL,   -- Myriad's 20% cut
  creator_earnings_cents INTEGER NOT NULL, -- Creator's 80%
  stripe_payment_intent_id TEXT NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate purchases
  UNIQUE(viewer_id, video_id)
);

CREATE INDEX idx_purchases_viewer ON purchases(viewer_id);
CREATE INDEX idx_purchases_video ON purchases(video_id);
CREATE INDEX idx_purchases_creator ON purchases(creator_id);
CREATE INDEX idx_purchases_status ON purchases(payment_status);

-- ============================================================
-- SUBSCRIPTIONS (monthly creator subscriptions)
-- ============================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stripe subscription
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL,          -- Monthly price
  platform_fee_cents INTEGER NOT NULL,   -- Myriad's 20%
  creator_earnings_cents INTEGER NOT NULL, -- Creator's 80%

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active subscription per creator per viewer
  UNIQUE(subscriber_id, creator_id)
);

CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ============================================================
-- RATINGS
-- ============================================================

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_ratings_video ON ratings(video_id);

-- ============================================================
-- LIKES
-- ============================================================

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_likes_video ON likes(video_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- ============================================================
-- COMMENTS
-- ============================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_video ON comments(video_id, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- ============================================================
-- VIDEO VIEWS (for analytics and trending)
-- ============================================================

CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for anonymous
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  ip_hash TEXT,  -- For anonymous dedup (hashed for privacy)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_views_video ON video_views(video_id);
CREATE INDEX idx_views_viewer ON video_views(viewer_id) WHERE viewer_id IS NOT NULL;
CREATE INDEX idx_views_created ON video_views(created_at DESC);

-- ============================================================
-- CREATOR PAYOUTS (tracking earnings)
-- ============================================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  stripe_transfer_id TEXT,
  payout_status payout_status NOT NULL DEFAULT 'pending',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_creator ON payouts(creator_id);
CREATE INDEX idx_payouts_status ON payouts(payout_status);

-- ============================================================
-- WATCHLIST / SAVED CONTENT
-- ============================================================

CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'new_episode', 'new_subscriber', 'purchase', 'comment', 'premiere'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,           -- URL to navigate to
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES: public read, own write
CREATE POLICY "Profiles are publicly viewable"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- VIDEOS: published are public, creators manage their own
CREATE POLICY "Published videos are publicly viewable"
  ON videos FOR SELECT USING (is_published = true OR creator_id = auth.uid());

CREATE POLICY "Creators can insert their own videos"
  ON videos FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their own videos"
  ON videos FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete their own videos"
  ON videos FOR DELETE USING (creator_id = auth.uid());

-- SERIES: published are public, creators manage their own
CREATE POLICY "Published series are publicly viewable"
  ON series FOR SELECT USING (is_published = true OR creator_id = auth.uid());

CREATE POLICY "Creators can manage their own series"
  ON series FOR ALL USING (creator_id = auth.uid());

-- PURCHASES: viewers see their own, creators see sales
CREATE POLICY "Viewers can see their own purchases"
  ON purchases FOR SELECT USING (viewer_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "System inserts purchases"
  ON purchases FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- SUBSCRIPTIONS: subscribers and creators see their own
CREATE POLICY "Users can see their own subscriptions"
  ON subscriptions FOR SELECT
  USING (subscriber_id = auth.uid() OR creator_id = auth.uid());

CREATE POLICY "System inserts subscriptions"
  ON subscriptions FOR INSERT WITH CHECK (subscriber_id = auth.uid());

-- RATINGS: public read, authenticated write
CREATE POLICY "Ratings are publicly viewable"
  ON ratings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can rate"
  ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE USING (auth.uid() = user_id);

-- LIKES: public read, authenticated write
CREATE POLICY "Likes are publicly viewable"
  ON likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like"
  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes"
  ON likes FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS: public read, authenticated write
CREATE POLICY "Comments are publicly viewable"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit their own comments"
  ON comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

-- VIDEO VIEWS: insert for everyone, select for creators
CREATE POLICY "Anyone can log a view"
  ON video_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can see views on their videos"
  ON video_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM videos WHERE videos.id = video_views.video_id AND videos.creator_id = auth.uid()
  ));

-- PAYOUTS: creators see their own
CREATE POLICY "Creators can see their own payouts"
  ON payouts FOR SELECT USING (creator_id = auth.uid());

-- WATCHLIST: users manage their own
CREATE POLICY "Users can manage their own watchlist"
  ON watchlist FOR ALL USING (user_id = auth.uid());

-- NOTIFICATIONS: users see their own
CREATE POLICY "Users can see their own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_videos_updated_at
  BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_series_updated_at
  BEFORE UPDATE ON series FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_comments_updated_at
  BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_ratings_updated_at
  BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update video stats on new rating
CREATE OR REPLACE FUNCTION update_video_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos SET
    avg_rating = (SELECT AVG(rating)::NUMERIC(3,2) FROM ratings WHERE video_id = COALESCE(NEW.video_id, OLD.video_id)),
    rating_count = (SELECT COUNT(*) FROM ratings WHERE video_id = COALESCE(NEW.video_id, OLD.video_id))
  WHERE id = COALESCE(NEW.video_id, OLD.video_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_video_rating_stats();

-- Update video like count
CREATE OR REPLACE FUNCTION update_video_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos SET
    like_count = (SELECT COUNT(*) FROM likes WHERE video_id = COALESCE(NEW.video_id, OLD.video_id))
  WHERE id = COALESCE(NEW.video_id, OLD.video_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_video_like_count();

-- Update video comment count
CREATE OR REPLACE FUNCTION update_video_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos SET
    comment_count = (SELECT COUNT(*) FROM comments WHERE video_id = COALESCE(NEW.video_id, OLD.video_id))
  WHERE id = COALESCE(NEW.video_id, OLD.video_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comment_count();

-- Update creator subscriber count
CREATE OR REPLACE FUNCTION update_creator_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    subscriber_count = (
      SELECT COUNT(*) FROM subscriptions
      WHERE creator_id = COALESCE(NEW.creator_id, OLD.creator_id) AND is_active = TRUE
    )
  WHERE id = COALESCE(NEW.creator_id, OLD.creator_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_subscriber_count
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_creator_subscriber_count();

-- Update series episode count
CREATE OR REPLACE FUNCTION update_series_episode_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.series_id IS NOT NULL THEN
    UPDATE series SET
      episode_count = (SELECT COUNT(*) FROM videos WHERE series_id = NEW.series_id AND is_published = TRUE)
    WHERE id = NEW.series_id;
  END IF;
  IF OLD IS NOT NULL AND OLD.series_id IS NOT NULL AND OLD.series_id IS DISTINCT FROM NEW.series_id THEN
    UPDATE series SET
      episode_count = (SELECT COUNT(*) FROM videos WHERE series_id = OLD.series_id AND is_published = TRUE)
    WHERE id = OLD.series_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_episode_count
  AFTER INSERT OR UPDATE OR DELETE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_series_episode_count();

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Check if a viewer has access to a video (purchased or subscribed)
CREATE OR REPLACE FUNCTION viewer_has_access(p_viewer_id UUID, p_video_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_video RECORD;
BEGIN
  SELECT pricing_model, creator_id INTO v_video FROM videos WHERE id = p_video_id;

  -- Free videos are always accessible
  IF v_video.pricing_model = 'free' THEN RETURN TRUE; END IF;

  -- Check per-video purchase
  IF EXISTS (
    SELECT 1 FROM purchases
    WHERE viewer_id = p_viewer_id AND video_id = p_video_id AND payment_status = 'completed'
  ) THEN RETURN TRUE; END IF;

  -- Check active subscription to creator
  IF EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriber_id = p_viewer_id AND creator_id = v_video.creator_id AND is_active = TRUE
  ) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trending videos view (for homepage)
CREATE OR REPLACE VIEW trending_videos AS
SELECT
  v.*,
  p.display_name AS creator_name,
  p.username AS creator_username,
  p.avatar_url AS creator_avatar,
  -- Trending score: weighted combo of recent views, likes, and ratings
  (
    (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id AND vv.created_at > NOW() - INTERVAL '7 days') * 1.0 +
    v.like_count * 2.0 +
    v.avg_rating * v.rating_count * 0.5 +
    v.purchase_count * 3.0
  ) AS trending_score
FROM videos v
JOIN profiles p ON p.id = v.creator_id
WHERE v.is_published = TRUE
ORDER BY trending_score DESC;
