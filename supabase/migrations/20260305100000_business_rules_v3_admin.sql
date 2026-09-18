-- Business Rules v3: Admin features (content rating, IP disputes, multi-dispute, quality review)

-- 1. Content rating on projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS content_rating text NOT NULL DEFAULT 'general'
    CHECK (content_rating IN ('general', 'teen', 'mature')),
  ADD COLUMN IF NOT EXISTS admin_rating_override text DEFAULT NULL
    CHECK (admin_rating_override IS NULL OR admin_rating_override IN ('general', 'teen', 'mature'));

-- 2. Copyright claim report type (content_reports already exists, add type value)
-- The report_type column is text, so no enum change needed — just use 'copyright_claim'

-- 3. Multi-dispute escalation: dispute_count and account_frozen on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dispute_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_frozen boolean NOT NULL DEFAULT false;

-- 4. Quality review queue: first-time creator uploads need manual review
-- Reuses project_updates.review_status (already exists: pending/approved/rejected)
-- Add film_review_status to projects for final film review
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS film_review_status text DEFAULT NULL
    CHECK (film_review_status IS NULL OR film_review_status IN ('pending', 'approved', 'rejected'));

-- 5. Account deletion: soft delete
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT NULL;
