-- Add new post intent values: showcase, work_in_progress
ALTER TYPE community_post_intent ADD VALUE IF NOT EXISTS 'showcase';
ALTER TYPE community_post_intent ADD VALUE IF NOT EXISTS 'work_in_progress';
