-- Drop old release_held_balance 2-arg overload (no auth guard) so we can recreate.
DROP FUNCTION IF EXISTS release_held_balance(UUID, INT);
