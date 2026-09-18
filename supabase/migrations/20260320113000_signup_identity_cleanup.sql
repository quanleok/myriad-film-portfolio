-- Make signup-generated profile names less noisy and clean up obvious legacy fallbacks.

CREATE OR REPLACE FUNCTION public.profile_compact_identity(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.profile_is_generic_identity_label(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    public.profile_compact_identity(value) IN (
      'user',
      'member',
      'creator',
      'anonymous',
      'newuser',
      'newmember',
      'newcreator'
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_email_local_is_humanish(value text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  compact text;
BEGIN
  cleaned := lower(trim(coalesce(value, '')));
  compact := public.profile_compact_identity(cleaned);

  IF compact IS NULL OR length(compact) < 3 THEN
    RETURN false;
  END IF;

  IF compact ~ '^[0-9]+$' THEN
    RETURN false;
  END IF;

  IF compact ~ '^[0-9a-f]{12,}$' THEN
    RETURN false;
  END IF;

  IF cleaned ~ '^(user|member|creator)[._-]?[0-9a-f]{4,}$' THEN
    RETURN false;
  END IF;

  IF cleaned !~ '[._-]'
     AND length(compact) > 16
     AND compact !~ '(ai|studio|films|film|media|world|works|show|cinema|hq|lab|labs|tv)$' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.profile_clean_metadata_name(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  compact text;
BEGIN
  cleaned := trim(coalesce(value, ''));
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  compact := public.profile_compact_identity(cleaned);

  IF cleaned = '' OR position('@' IN cleaned) > 0 THEN
    RETURN NULL;
  END IF;

  IF compact IS NULL OR public.profile_is_generic_identity_label(cleaned) THEN
    RETURN NULL;
  END IF;

  IF compact ~ '^[0-9]+$' OR compact ~ '^[0-9a-f]{12,}$' THEN
    RETURN NULL;
  END IF;

  RETURN left(cleaned, 50);
END;
$$;

CREATE OR REPLACE FUNCTION public.profile_generate_display_name(
  p_email text,
  p_full_name text,
  p_name text,
  p_is_creator boolean
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  candidate text;
  email_local text;
BEGIN
  candidate := public.profile_clean_metadata_name(p_full_name);
  IF candidate IS NOT NULL THEN
    RETURN candidate;
  END IF;

  candidate := public.profile_clean_metadata_name(p_name);
  IF candidate IS NOT NULL THEN
    RETURN candidate;
  END IF;

  email_local := split_part(coalesce(p_email, ''), '@', 1);
  IF public.profile_email_local_is_humanish(email_local) THEN
    candidate := regexp_replace(email_local, '[._-]+', ' ', 'g');
    candidate := regexp_replace(candidate, '\s+', ' ', 'g');
    candidate := trim(candidate);

    IF candidate <> '' THEN
      RETURN left(initcap(candidate), 50);
    END IF;
  END IF;

  IF coalesce(p_is_creator, false) THEN
    RETURN 'New Creator';
  END IF;

  RETURN 'New Member';
END;
$$;

CREATE OR REPLACE FUNCTION public.profile_generate_username_base(
  p_email text,
  p_full_name text,
  p_name text,
  p_preferred_username text,
  p_is_creator boolean
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  candidate text;
  email_local text;
BEGIN
  candidate := NULLIF(
    regexp_replace(lower(trim(coalesce(p_preferred_username, ''))), '[^a-z0-9_]', '', 'g'),
    ''
  );
  IF candidate IS NOT NULL
     AND length(candidate) >= 3
     AND candidate !~ '^user_[0-9a-f]{8,32}$'
     AND candidate !~ '^member_[0-9a-f]{8,32}$'
     AND candidate !~ '^creator_[0-9a-f]{8,32}$' THEN
    RETURN left(candidate, 20);
  END IF;

  candidate := NULLIF(
    regexp_replace(lower(trim(coalesce(p_full_name, ''))), '[^a-z0-9]', '', 'g'),
    ''
  );
  IF candidate IS NOT NULL AND length(candidate) >= 3 THEN
    RETURN left(candidate, 20);
  END IF;

  candidate := NULLIF(
    regexp_replace(lower(trim(coalesce(p_name, ''))), '[^a-z0-9]', '', 'g'),
    ''
  );
  IF candidate IS NOT NULL AND length(candidate) >= 3 THEN
    RETURN left(candidate, 20);
  END IF;

  email_local := split_part(coalesce(p_email, ''), '@', 1);
  IF public.profile_email_local_is_humanish(email_local) THEN
    candidate := NULLIF(
      regexp_replace(lower(email_local), '[^a-z0-9]', '', 'g'),
      ''
    );
    IF candidate IS NOT NULL AND length(candidate) >= 3 THEN
      RETURN left(candidate, 20);
    END IF;
  END IF;

  IF coalesce(p_is_creator, false) THEN
    RETURN 'creator';
  END IF;

  RETURN 'member';
END;
$$;

CREATE OR REPLACE FUNCTION public.profile_username_with_suffix(base text, suffix text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned_base text;
  cleaned_suffix text;
  base_limit integer;
BEGIN
  cleaned_base := NULLIF(
    regexp_replace(lower(coalesce(base, '')), '[^a-z0-9_]', '', 'g'),
    ''
  );
  cleaned_suffix := left(
    coalesce(
      NULLIF(regexp_replace(lower(coalesce(suffix, '')), '[^a-z0-9]', '', 'g'), ''),
      'user'
    ),
    4
  );

  IF cleaned_base IS NULL THEN
    cleaned_base := 'member';
  END IF;

  base_limit := greatest(1, 20 - 1 - char_length(cleaned_suffix));
  cleaned_base := left(trim(trailing '_' FROM cleaned_base), base_limit);

  RETURN cleaned_base || '_' || cleaned_suffix;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username text;
  new_display_name text;
  new_avatar text;
  new_is_creator boolean;
  username_suffix text;
BEGIN
  new_is_creator := COALESCE((NEW.raw_user_meta_data->>'is_creator')::boolean, false);

  new_display_name := public.profile_generate_display_name(
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    new_is_creator
  );

  new_username := public.profile_generate_username_base(
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'preferred_username',
    new_is_creator
  );

  IF new_username IN ('creator', 'member') THEN
    username_suffix := substr(replace(NEW.id::text, '-', ''), 1, 4);
    new_username := public.profile_username_with_suffix(new_username, username_suffix);
  END IF;

  new_avatar := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.profiles (id, display_name, username, avatar_url, is_creator)
  VALUES (NEW.id, new_display_name, new_username, new_avatar, new_is_creator)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.profiles (id, display_name, username, avatar_url, is_creator)
    VALUES (
      NEW.id,
      new_display_name,
      public.profile_username_with_suffix(new_username, substr(md5(random()::text), 1, 4)),
      new_avatar,
      new_is_creator
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

WITH profile_candidates AS (
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.is_creator,
    u.email,
    split_part(coalesce(u.email, ''), '@', 1) AS email_local,
    public.profile_compact_identity(split_part(coalesce(u.email, ''), '@', 1)) AS email_local_compact,
    public.profile_generate_display_name(
      u.email,
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      p.is_creator
    ) AS next_display_name,
    public.profile_generate_username_base(
      u.email,
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'preferred_username',
      p.is_creator
    ) AS next_username_base,
    substr(replace(p.id::text, '-', ''), 1, 4) AS fallback_suffix
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
),
profile_refresh_flags AS (
  SELECT
    c.*,
    (
      public.profile_is_generic_identity_label(c.display_name)
      OR (
        NOT public.profile_email_local_is_humanish(c.email_local)
        AND public.profile_compact_identity(c.display_name) = c.email_local_compact
      )
    ) AS refresh_display_name,
    (
      c.username ~ '^user_[0-9a-f]{8}$'
      OR c.username ~ '^user_[0-9a-f]{32}$'
      OR c.username ~ '^user_[0-9a-f]{8,32}_[0-9a-f]{4}$'
      OR c.username ~ '^member_[0-9a-f]{8,32}$'
      OR c.username ~ '^creator_[0-9a-f]{8,32}$'
      OR (
        c.email_local_compact IS NOT NULL
        AND NOT public.profile_email_local_is_humanish(c.email_local)
        AND c.username ~ ('^' || c.email_local_compact || '(_[0-9a-f]{4})?$')
      )
      OR (
        c.next_username_base NOT IN ('creator', 'member')
        AND c.username ~ ('^' || c.next_username_base || '_[0-9a-f]{4}$')
      )
    ) AS refresh_username
  FROM profile_candidates c
)
UPDATE public.profiles p
SET
  display_name = CASE
    WHEN f.refresh_display_name THEN f.next_display_name
    ELSE p.display_name
  END,
  username = CASE
    WHEN NOT f.refresh_username THEN p.username
    WHEN f.next_username_base IN ('creator', 'member') THEN
      public.profile_username_with_suffix(f.next_username_base, f.fallback_suffix)
    WHEN EXISTS (
      SELECT 1
      FROM public.profiles other
      WHERE other.id <> f.id
        AND other.username = f.next_username_base
    ) THEN
      public.profile_username_with_suffix(f.next_username_base, f.fallback_suffix)
    ELSE
      f.next_username_base
  END
FROM profile_refresh_flags f
WHERE p.id = f.id
  AND (f.refresh_display_name OR f.refresh_username);
