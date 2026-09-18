-- Fix credit_late_preorder: must record platform_fee event so delivery route
-- can find held amounts and release them. Without this, late preorder held
-- balance is stuck forever in held_balance_cents.
DROP FUNCTION IF EXISTS credit_late_preorder(UUID, UUID, INT);
