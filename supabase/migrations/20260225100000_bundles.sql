-- ============================================================
-- Bundles: creator-curated content packs sold at a discount
-- ============================================================

-- bundles table
CREATE TABLE IF NOT EXISTS public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  price_cents integer,  -- NULL = free
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bundles_creator_id ON public.bundles(creator_id);
CREATE INDEX IF NOT EXISTS idx_bundles_published ON public.bundles(is_published) WHERE is_published = true;

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Published bundles are viewable by everyone"
    ON public.bundles FOR SELECT USING (is_published = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can view own bundles"
    ON public.bundles FOR SELECT USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can insert own bundles"
    ON public.bundles FOR INSERT WITH CHECK (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can update own bundles"
    ON public.bundles FOR UPDATE USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can delete own bundles"
    ON public.bundles FOR DELETE USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- bundle_items table
CREATE TABLE IF NOT EXISTS public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  UNIQUE(bundle_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON public.bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_video ON public.bundle_items(video_id);

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Bundle items viewable if bundle is viewable"
    ON public.bundle_items FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.bundles b
        WHERE b.id = bundle_id
        AND (b.is_published = true OR b.creator_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can insert bundle items"
    ON public.bundle_items FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.bundles b
        WHERE b.id = bundle_id AND b.creator_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can update bundle items"
    ON public.bundle_items FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.bundles b
        WHERE b.id = bundle_id AND b.creator_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can delete bundle items"
    ON public.bundle_items FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.bundles b
        WHERE b.id = bundle_id AND b.creator_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- bundle_purchases table
CREATE TABLE IF NOT EXISTS public.bundle_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  creator_earnings_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text NOT NULL DEFAULT '',
  payment_status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(viewer_id, bundle_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_purchases_viewer ON public.bundle_purchases(viewer_id);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_bundle ON public.bundle_purchases(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_creator ON public.bundle_purchases(creator_id);

ALTER TABLE public.bundle_purchases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Viewers can see own bundle purchases"
    ON public.bundle_purchases FOR SELECT USING (auth.uid() = viewer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can see purchases of own bundles"
    ON public.bundle_purchases FOR SELECT USING (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert bundle purchases"
    ON public.bundle_purchases FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update viewer_has_access to also check bundle purchases
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

  -- Check bundle purchases: viewer bought a bundle containing this video
  IF EXISTS (
    SELECT 1 FROM bundle_purchases bp
    JOIN bundle_items bi ON bi.bundle_id = bp.bundle_id
    WHERE bp.viewer_id = p_viewer_id
      AND bi.video_id = p_video_id
      AND bp.payment_status = 'completed'
  ) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
