"use client";

import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Returns shared auth state from the AuthProvider.
 * Only fetches session + profile once for the entire app.
 */
export function useAuth() {
  return useAuthContext();
}
