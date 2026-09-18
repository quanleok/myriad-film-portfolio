-- "Want this made" interest signal — one per user per project
CREATE TABLE IF NOT EXISTS public.project_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Cache column on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS interest_count_cache integer NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE public.project_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own interests"
  ON public.project_interests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
  ON public.project_interests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read interests"
  ON public.project_interests FOR SELECT
  USING (true);

-- Trigger to maintain cache count
CREATE OR REPLACE FUNCTION update_interest_count_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects
    SET interest_count_cache = interest_count_cache + 1
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects
    SET interest_count_cache = GREATEST(interest_count_cache - 1, 0)
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_interest_count_cache
  AFTER INSERT OR DELETE ON public.project_interests
  FOR EACH ROW EXECUTE FUNCTION update_interest_count_cache();

-- Protect interest_count_cache from authenticated user updates
-- (update the existing protect_project_columns function)
CREATE OR REPLACE FUNCTION protect_project_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.lifecycle_status := OLD.lifecycle_status;
  NEW.moderation_status := OLD.moderation_status;
  NEW.visibility := OLD.visibility;

  NEW.preorder_count_cache := OLD.preorder_count_cache;
  NEW.like_count_cache := OLD.like_count_cache;
  NEW.discussion_count_cache := OLD.discussion_count_cache;
  NEW.purchase_count_cache := OLD.purchase_count_cache;
  NEW.update_count_cache := OLD.update_count_cache;
  NEW.interest_count_cache := OLD.interest_count_cache;

  NEW.unlocked_at := OLD.unlocked_at;
  NEW.delivered_at := OLD.delivered_at;
  NEW.campaign_starts_at := OLD.campaign_starts_at;
  NEW.campaign_ends_at := OLD.campaign_ends_at;

  NEW.creator_id := OLD.creator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
