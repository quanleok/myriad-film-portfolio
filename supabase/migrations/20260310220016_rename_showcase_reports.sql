-- Rename showcase_reports to community_reports (missed in prior rename migration)
ALTER TABLE IF EXISTS showcase_reports RENAME TO community_reports;
