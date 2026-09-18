-- Drop old decrement_held_balance (returns BOOLEAN) so we can recreate with void + auth guard.
DROP FUNCTION IF EXISTS decrement_held_balance(UUID, INT);
