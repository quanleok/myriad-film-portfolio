-- Generate clean usernames from name/email instead of raw UUIDs
-- e.g. "Demo User" -> "demouser", "demo@example.test" -> "demo"
-- Appends short random suffix for uniqueness

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  new_display_name TEXT;
  new_avatar TEXT;
  new_is_creator BOOLEAN;
  base_username TEXT;
BEGIN
  -- Build display name from metadata, falling back to email prefix
  new_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Build username: prefer OAuth preferred_username
  new_username := NULLIF(NEW.raw_user_meta_data->>'preferred_username', '');

  -- If no preferred_username, derive from name or email
  IF new_username IS NULL THEN
    -- Try name first, then email prefix
    base_username := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(NEW.email, '@', 1)
    );

    -- Lowercase, keep only letters and numbers, trim to 20 chars
    base_username := substr(
      regexp_replace(lower(base_username), '[^a-z0-9]', '', 'g'),
      1, 20
    );

    -- Fallback if name produced empty string
    IF base_username = '' OR base_username IS NULL THEN
      base_username := 'user';
    END IF;

    -- Append 4-char random suffix for uniqueness
    new_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  -- Avatar URL from OAuth provider
  new_avatar := NEW.raw_user_meta_data->>'avatar_url';

  -- Check if user signed up as creator
  new_is_creator := COALESCE((NEW.raw_user_meta_data->>'is_creator')::boolean, false);

  INSERT INTO public.profiles (id, display_name, username, avatar_url, is_creator)
  VALUES (NEW.id, new_display_name, new_username, new_avatar, new_is_creator)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username collision — retry with different random suffix
    INSERT INTO public.profiles (id, display_name, username, avatar_url, is_creator)
    VALUES (NEW.id, new_display_name, new_username || substr(md5(random()::text), 1, 4), new_avatar, new_is_creator)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
