-- Follows table: free follow without subscribing
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, creator_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON public.follows FOR SELECT
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can follow creators"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE POLICY "Creators can see their followers"
  ON public.follows FOR SELECT
  USING (auth.uid() = creator_id);

-- Watch history table
CREATE TABLE IF NOT EXISTS public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  last_position_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch history"
  ON public.watch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
  ON public.watch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
  ON public.watch_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Add follower_count to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0;
