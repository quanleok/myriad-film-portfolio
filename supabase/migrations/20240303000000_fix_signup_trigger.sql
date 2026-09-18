-- Fix handle_new_user() trigger to be more robust:
-- 1. Use replace() on full UUID to guarantee unique usernames
-- 2. Handle NULL raw_user_meta_data gracefully
-- 3. Add exception handling to prevent signup failures

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  new_display_name TEXT;
  new_avatar TEXT;
BEGIN
  -- Build display name from metadata, falling back to 'User'
  new_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Build username: use preferred_username if available, otherwise
  -- use full UUID without hyphens for guaranteed uniqueness
  new_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
    'user_' || replace(NEW.id::text, '-', '')
  );

  -- Avatar URL from OAuth provider
  new_avatar := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.profiles (id, display_name, username, avatar_url)
  VALUES (NEW.id, new_display_name, new_username, new_avatar)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username collision (very unlikely with full UUID, but handle it)
    INSERT INTO public.profiles (id, display_name, username, avatar_url)
    VALUES (NEW.id, new_display_name, 'user_' || replace(NEW.id::text, '-', ''), new_avatar)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Never block signup — log and continue
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
