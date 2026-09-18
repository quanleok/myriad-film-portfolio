-- Protect system-managed project columns from direct client updates.
-- Same pattern as protect_profile_columns — service_role can update anything,
-- but authenticated users get privileged columns reverted to their old values.
-- Without this, a creator could set preorder_count_cache=99999 to trigger
-- auto-greenlight, or set moderation_status='live' to bypass admin review.

CREATE OR REPLACE FUNCTION protect_project_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Lifecycle & moderation (only changed by system/admin)
  NEW.lifecycle_status := OLD.lifecycle_status;
  NEW.moderation_status := OLD.moderation_status;
  NEW.visibility := OLD.visibility;

  -- Count caches (only changed by triggers/RPCs)
  NEW.preorder_count_cache := OLD.preorder_count_cache;
  NEW.like_count_cache := OLD.like_count_cache;
  NEW.discussion_count_cache := OLD.discussion_count_cache;
  NEW.purchase_count_cache := OLD.purchase_count_cache;
  NEW.update_count_cache := OLD.update_count_cache;

  -- Dates managed by system
  NEW.unlocked_at := OLD.unlocked_at;
  NEW.delivered_at := OLD.delivered_at;
  NEW.campaign_starts_at := OLD.campaign_starts_at;
  NEW.campaign_ends_at := OLD.campaign_ends_at;

  -- Ownership (never changes)
  NEW.creator_id := OLD.creator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger (drop first if exists to be safe)
DROP TRIGGER IF EXISTS protect_project_columns_trigger ON projects;
CREATE TRIGGER protect_project_columns_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION protect_project_columns();
