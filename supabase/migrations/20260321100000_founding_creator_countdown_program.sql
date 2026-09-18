CREATE TABLE IF NOT EXISTS founding_creator_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('teaser_auto', 'invite_code', 'application', 'legacy_manual')),
  qualifying_project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL,
  slot_number INTEGER NULL CHECK (slot_number BETWEEN 1 AND 100),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT founding_creator_awards_slot_source_check CHECK (
    (source = 'teaser_auto' AND slot_number IS NOT NULL)
    OR (source <> 'teaser_auto' AND slot_number IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_founding_creator_awards_user
  ON founding_creator_awards(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_founding_creator_awards_slot
  ON founding_creator_awards(slot_number)
  WHERE slot_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_founding_creator_awards_source
  ON founding_creator_awards(source);

CREATE INDEX IF NOT EXISTS idx_founding_creator_awards_project
  ON founding_creator_awards(qualifying_project_id)
  WHERE qualifying_project_id IS NOT NULL;

ALTER TABLE founding_creator_awards ENABLE ROW LEVEL SECURITY;

INSERT INTO founding_creator_awards (user_id, source, qualifying_project_id, slot_number, granted_at)
SELECT
  p.id,
  'legacy_manual',
  NULL,
  NULL,
  COALESCE(p.founding_creator_approved_at, NOW())
FROM profiles p
WHERE p.is_founding_creator = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM founding_creator_awards awards
    WHERE awards.user_id = p.id
  );

CREATE OR REPLACE FUNCTION grant_founding_creator_access(
  p_user_id UUID,
  p_source TEXT,
  p_qualifying_project_id UUID DEFAULT NULL,
  p_public_ends_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_award RECORD;
  inserted_award RECORD;
  teaser_claimed_count INTEGER := 0;
  assigned_slot INTEGER := NULL;
  now_ts TIMESTAMPTZ := NOW();
  program_open BOOLEAN := TRUE;
BEGIN
  IF p_source NOT IN ('teaser_auto', 'invite_code', 'application', 'legacy_manual') THEN
    RAISE EXCEPTION 'invalid founding creator source';
  END IF;

  SELECT source, slot_number, granted_at
  INTO existing_award
  FROM founding_creator_awards
  WHERE user_id = p_user_id;

  IF FOUND THEN
    SELECT COUNT(*)
    INTO teaser_claimed_count
    FROM founding_creator_awards
    WHERE source = 'teaser_auto';

    program_open := COALESCE(p_public_ends_at > now_ts, TRUE) AND teaser_claimed_count < 100;

    RETURN jsonb_build_object(
      'awarded', FALSE,
      'already_founding', TRUE,
      'source', existing_award.source,
      'slot_number', existing_award.slot_number,
      'granted_at', existing_award.granted_at,
      'claimed_teaser_slots', teaser_claimed_count,
      'remaining_teaser_slots', GREATEST(100 - teaser_claimed_count, 0),
      'public_program_open', program_open
    );
  END IF;

  IF p_source = 'teaser_auto' THEN
    IF p_public_ends_at IS NULL OR p_public_ends_at <= now_ts THEN
      SELECT COUNT(*)
      INTO teaser_claimed_count
      FROM founding_creator_awards
      WHERE source = 'teaser_auto';

      RETURN jsonb_build_object(
        'awarded', FALSE,
        'already_founding', FALSE,
        'source', NULL,
        'slot_number', NULL,
        'granted_at', NULL,
        'claimed_teaser_slots', teaser_claimed_count,
        'remaining_teaser_slots', GREATEST(100 - teaser_claimed_count, 0),
        'public_program_open', FALSE
      );
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('founding_creator_teaser_slots'));

    SELECT source, slot_number, granted_at
    INTO existing_award
    FROM founding_creator_awards
    WHERE user_id = p_user_id;

    IF FOUND THEN
      SELECT COUNT(*)
      INTO teaser_claimed_count
      FROM founding_creator_awards
      WHERE source = 'teaser_auto';

      program_open := COALESCE(p_public_ends_at > now_ts, TRUE) AND teaser_claimed_count < 100;

      RETURN jsonb_build_object(
        'awarded', FALSE,
        'already_founding', TRUE,
        'source', existing_award.source,
        'slot_number', existing_award.slot_number,
        'granted_at', existing_award.granted_at,
        'claimed_teaser_slots', teaser_claimed_count,
        'remaining_teaser_slots', GREATEST(100 - teaser_claimed_count, 0),
        'public_program_open', program_open
      );
    END IF;

    SELECT COUNT(*)
    INTO teaser_claimed_count
    FROM founding_creator_awards
    WHERE source = 'teaser_auto';

    IF teaser_claimed_count >= 100 THEN
      RETURN jsonb_build_object(
        'awarded', FALSE,
        'already_founding', FALSE,
        'source', NULL,
        'slot_number', NULL,
        'granted_at', NULL,
        'claimed_teaser_slots', teaser_claimed_count,
        'remaining_teaser_slots', 0,
        'public_program_open', FALSE
      );
    END IF;

    assigned_slot := teaser_claimed_count + 1;
  END IF;

  INSERT INTO founding_creator_awards (user_id, source, qualifying_project_id, slot_number, granted_at)
  VALUES (p_user_id, p_source, p_qualifying_project_id, assigned_slot, now_ts)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING source, slot_number, granted_at
  INTO inserted_award;

  IF inserted_award IS NULL THEN
    SELECT source, slot_number, granted_at
    INTO existing_award
    FROM founding_creator_awards
    WHERE user_id = p_user_id;

    SELECT COUNT(*)
    INTO teaser_claimed_count
    FROM founding_creator_awards
    WHERE source = 'teaser_auto';

    program_open := COALESCE(p_public_ends_at > now_ts, TRUE) AND teaser_claimed_count < 100;

    RETURN jsonb_build_object(
      'awarded', FALSE,
      'already_founding', TRUE,
      'source', existing_award.source,
      'slot_number', existing_award.slot_number,
      'granted_at', existing_award.granted_at,
      'claimed_teaser_slots', teaser_claimed_count,
      'remaining_teaser_slots', GREATEST(100 - teaser_claimed_count, 0),
      'public_program_open', program_open
    );
  END IF;

  UPDATE profiles
  SET
    is_founding_creator = TRUE,
    founding_creator_approved_at = COALESCE(founding_creator_approved_at, now_ts),
    is_creator = TRUE,
    creator_onboarding_completed = TRUE,
    role = 'creator'
  WHERE id = p_user_id;

  SELECT COUNT(*)
  INTO teaser_claimed_count
  FROM founding_creator_awards
  WHERE source = 'teaser_auto';

  program_open := COALESCE(p_public_ends_at > now_ts, TRUE) AND teaser_claimed_count < 100;

  RETURN jsonb_build_object(
    'awarded', TRUE,
    'already_founding', FALSE,
    'source', inserted_award.source,
    'slot_number', inserted_award.slot_number,
    'granted_at', inserted_award.granted_at,
    'claimed_teaser_slots', teaser_claimed_count,
    'remaining_teaser_slots', GREATEST(100 - teaser_claimed_count, 0),
    'public_program_open', program_open
  );
END;
$$;

REVOKE ALL ON FUNCTION grant_founding_creator_access(UUID, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION grant_founding_creator_access(UUID, TEXT, UUID, TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION grant_founding_creator_access(UUID, TEXT, UUID, TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION grant_founding_creator_access(UUID, TEXT, UUID, TIMESTAMPTZ) TO service_role;
