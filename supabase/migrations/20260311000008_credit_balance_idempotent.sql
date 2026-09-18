-- Drop and recreate credit_creator_balance with idempotency guard.
-- Prevents double-crediting if called multiple times for the same project.
DROP FUNCTION IF EXISTS credit_creator_balance(UUID, UUID);
