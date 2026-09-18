CREATE OR REPLACE FUNCTION check_and_unlock_project(p_project_id UUID)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  proj RECORD;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id, unlock_target, preorder_count_cache, lifecycle_status
  INTO proj FROM projects WHERE id = p_project_id FOR UPDATE;
  IF proj IS NULL OR proj.lifecycle_status != 'unlocking' THEN
    RETURN false;
  END IF;
  IF proj.preorder_count_cache >= proj.unlock_target THEN
    UPDATE projects
    SET lifecycle_status = 'in_production',
        unlocked_at = now(),
        estimated_delivery_at = now() + (production_window_days || ' days')::interval
    WHERE id = p_project_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
