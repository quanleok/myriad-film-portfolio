-- Fix C2: Atomic invite creation with collaborator count check
-- Prevents race condition where concurrent invites bypass the max limit

CREATE OR REPLACE FUNCTION invite_project_collaborator(
  p_project_id UUID,
  p_user_id UUID,
  p_invited_by UUID,
  p_role TEXT,
  p_can_view_earnings BOOLEAN,
  p_max_collaborators INTEGER DEFAULT 2
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_active_count INTEGER;
  v_collaborator_id UUID;
BEGIN
  -- Lock the project row to serialize concurrent invites
  PERFORM 1 FROM public.projects WHERE id = p_project_id FOR UPDATE;

  -- Count active (pending + accepted) non-owner collaborators
  SELECT COUNT(*) INTO v_active_count
  FROM public.project_collaborators
  WHERE project_id = p_project_id
    AND role != 'owner'
    AND invite_status IN ('pending', 'accepted');

  IF v_active_count >= p_max_collaborators THEN
    RAISE EXCEPTION 'max_collaborators_reached';
  END IF;

  -- Upsert the collaborator row
  INSERT INTO public.project_collaborators (
    project_id, user_id, invited_by, role, invite_status,
    can_view_earnings, accepted_at, revoked_at
  )
  VALUES (
    p_project_id, p_user_id, p_invited_by, p_role, 'pending',
    p_can_view_earnings, NULL, NULL
  )
  ON CONFLICT (project_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    invite_status = 'pending',
    invited_by = EXCLUDED.invited_by,
    can_view_earnings = EXCLUDED.can_view_earnings,
    accepted_at = NULL,
    revoked_at = NULL,
    updated_at = now()
  RETURNING id INTO v_collaborator_id;

  RETURN v_collaborator_id;
END;
$$;

-- Revoke public access, restrict to service_role only
REVOKE ALL ON FUNCTION invite_project_collaborator FROM PUBLIC;
GRANT EXECUTE ON FUNCTION invite_project_collaborator TO service_role;

-- Fix M4: Add composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_status
  ON project_collaborators(user_id, invite_status);
