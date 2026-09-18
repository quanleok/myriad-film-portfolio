-- Update handle_new_user() to set is_creator from signup metadata
-- so users who check "I want to be a creator" on signup are marked accordingly

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  new_display_name TEXT;
  new_avatar TEXT;
  new_is_creator BOOLEAN;
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

  -- Check if user signed up as creator
  new_is_creator := COALESCE((NEW.raw_user_meta_data->>'is_creator')::boolean, false);

  INSERT INTO public.profiles (id, display_name, username, avatar_url, is_creator)
  VALUES (NEW.id, new_display_name, new_username, new_avatar, new_is_creator)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Username collision (very unlikely with full UUID, but handle it)
    INSERT INTO public.profiles (id, display_name, username, avatar_url, is_creator)
    VALUES (NEW.id, new_display_name, new_username || '_' || substr(md5(random()::text), 1, 4), new_avatar, new_is_creator)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
