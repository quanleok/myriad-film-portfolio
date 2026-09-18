import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Check if the authenticated user is banned.
 * Returns a 403 response if banned, null if not banned (or no user).
 * Call this after auth check in mutation API routes.
 */
export async function checkBanned(
  userId: string
): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", userId)
    .single();

  if (profile?.is_banned) {
    return NextResponse.json(
      { error: "Your account has been suspended" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Log a failed authentication attempt as a Sentry breadcrumb.
 * Call this when a request to a sensitive route has no valid user session.
 */
export function logFailedAuth(path: string, method: string): void {
  Sentry.addBreadcrumb({
    category: "auth",
    message: `Failed auth: ${method} ${path}`,
    level: "warning",
  });
}
