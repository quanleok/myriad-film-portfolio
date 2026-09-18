import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cap the map size to prevent unbounded memory growth
const MAX_ENTRIES = 10_000;

/**
 * Touch a key so it becomes the most-recently-used entry in the Map.
 * (Map insertion order is preserved, so delete + re-set moves it to the end.)
 */
function touch(key: string, entry: RateLimitEntry) {
  rateLimitMap.delete(key);
  rateLimitMap.set(key, entry);
}

/**
 * Evict expired entries, then evict least-recently-used if still over cap.
 */
function evict() {
  const now = Date.now();

  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }

  // Evict least-recently-used (oldest insertion order) if over cap
  if (rateLimitMap.size > MAX_ENTRIES) {
    const excess = rateLimitMap.size - MAX_ENTRIES;
    const iter = rateLimitMap.keys();
    for (let i = 0; i < excess; i++) {
      const key = iter.next().value;
      if (key) rateLimitMap.delete(key);
    }
  }
}

/**
 * In-memory rate limiter with LRU eviction.
 *
 * @param identifier  Unique key for this limit bucket (e.g. IP + route)
 * @param limit       Maximum requests allowed in the window
 * @param windowMs    Time window in milliseconds
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  evict();

  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now >= entry.resetAt) {
    // First request in this window — insert at end (most recent)
    rateLimitMap.delete(identifier);
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  entry.count += 1;
  // Move to end so active buckets aren't evicted
  touch(identifier, entry);

  if (entry.count > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - entry.count };
}

/**
 * Helper for API routes. Call at the top of any handler.
 * Returns a 429 Response if the limit is exceeded, or null if the request is allowed.
 *
 * @param routeKey   A unique name for the route (used as part of the bucket key)
 * @param limit      Maximum requests allowed in the window
 * @param windowMs   Time window in milliseconds (default: 60 000 = 1 minute)
 */
export async function checkRateLimit(
  routeKey: string,
  limit: number,
  windowMs: number = 60_000
): Promise<NextResponse | null> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";

  const key = `${routeKey}:${ip}`;
  const result = rateLimit(key, limit, windowMs);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(windowMs / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
