-- Add cache columns for card stats
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS purchase_count_cache integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS update_count_cache integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_count_cache integer NOT NULL DEFAULT 0;

-- Trigger: purchase_count_cache
CREATE OR REPLACE FUNCTION update_purchase_count_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET purchase_count_cache = purchase_count_cache + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET purchase_count_cache = GREATEST(0, purchase_count_cache - 1) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_count_cache ON post_release_purchases;
CREATE TRIGGER trg_purchase_count_cache
  AFTER INSERT OR DELETE ON post_release_purchases
  FOR EACH ROW EXECUTE FUNCTION update_purchase_count_cache();

-- Trigger: update_count_cache
CREATE OR REPLACE FUNCTION update_update_count_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET update_count_cache = update_count_cache + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET update_count_cache = GREATEST(0, update_count_cache - 1) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_count_cache ON project_updates;
CREATE TRIGGER trg_update_count_cache
  AFTER INSERT OR DELETE ON project_updates
  FOR EACH ROW EXECUTE FUNCTION update_update_count_cache();

-- Trigger: save_count_cache
CREATE OR REPLACE FUNCTION update_save_count_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET save_count_cache = save_count_cache + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET save_count_cache = GREATEST(0, save_count_cache - 1) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_save_count_cache ON project_saves;
CREATE TRIGGER trg_save_count_cache
  AFTER INSERT OR DELETE ON project_saves
  FOR EACH ROW EXECUTE FUNCTION update_save_count_cache();

-- Backfill existing counts
UPDATE projects p SET purchase_count_cache = (
  SELECT COUNT(*) FROM post_release_purchases WHERE project_id = p.id
);
UPDATE projects p SET update_count_cache = (
  SELECT COUNT(*) FROM project_updates WHERE project_id = p.id
);
UPDATE projects p SET save_count_cache = (
  SELECT COUNT(*) FROM project_saves WHERE project_id = p.id
);
