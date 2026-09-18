-- Mark seed projects as test projects
-- Add is_test column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- Mark existing seed projects
UPDATE projects SET is_test = true
WHERE slug IN (
  'echoes-of-the-singularity',
  'last-ronin-neo-kyoto',
  'jade-empress-iron-crane',
  'neon-requiem',
  'whispers-in-the-algorithm'
);
