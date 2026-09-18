-- Add AI-focused video categories to the genre enum
-- These replace movie genres as the primary video categories
-- Old values remain in enum for backward compatibility with existing content
ALTER TYPE genre ADD VALUE IF NOT EXISTS 'showcase';
ALTER TYPE genre ADD VALUE IF NOT EXISTS 'prompt_test';
ALTER TYPE genre ADD VALUE IF NOT EXISTS 'model_vs_model';
ALTER TYPE genre ADD VALUE IF NOT EXISTS 'tutorial';
ALTER TYPE genre ADD VALUE IF NOT EXISTS 'meme';
ALTER TYPE genre ADD VALUE IF NOT EXISTS 'short_film';
ALTER TYPE genre ADD VALUE IF NOT EXISTS 'behind_the_scenes';
