-- Drop old atomic_withdraw (returns BOOLEAN) so we can recreate with void + auth guard.
DROP FUNCTION IF EXISTS atomic_withdraw(UUID, INT);
