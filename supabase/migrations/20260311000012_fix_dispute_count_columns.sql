-- Fix increment_dispute_count: references dropped columns is_frozen and is_flagged.
-- Correct column is account_frozen. is_flagged doesn't exist.
DROP FUNCTION IF EXISTS increment_dispute_count(UUID);
