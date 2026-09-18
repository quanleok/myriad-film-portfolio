-- Missing indexes identified during platform infrastructure audit
-- These columns are used in WHERE/JOIN clauses but lack indexes

CREATE INDEX IF NOT EXISTS idx_follows_creator_id ON follows(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_id ON lesson_progress(course_id);
