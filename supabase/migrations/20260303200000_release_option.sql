-- ---------------------------------------------------------------------------
-- Add release option columns to projects table
-- ---------------------------------------------------------------------------

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS release_option text
    CHECK (release_option IS NULL OR release_option IN ('backers_only', 'premium_purchase', 'free')),
  ADD COLUMN IF NOT EXISTS purchase_price_cents integer
    CHECK (purchase_price_cents IS NULL OR (purchase_price_cents >= 300 AND purchase_price_cents <= 1500));

-- ---------------------------------------------------------------------------
-- Update viewer_has_access to also check project_entitlements
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION viewer_has_access(p_viewer_id UUID, p_video_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_video RECORD;
BEGIN
  SELECT pricing_model, creator_id INTO v_video FROM videos WHERE id = p_video_id;

  -- Free videos are always accessible
  IF v_video.pricing_model = 'free' THEN RETURN TRUE; END IF;

  -- Check project entitlement (preorder backers)
  IF EXISTS (
    SELECT 1 FROM project_entitlements
    WHERE user_id = p_viewer_id AND video_id = p_video_id
  ) THEN RETURN TRUE; END IF;

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
