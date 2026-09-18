import { randomBytes } from "node:crypto";

/** @param {Record<string, string | undefined>} [env] */
export function requireLocalSeedEnvironment(env = process.env) {
  if (env.NODE_ENV === "production") {
    throw new Error("Demo and maintenance tools cannot run in production mode.");
  }
  if (env.MYRIAD_SEED_CONFIRM !== "local-demo-only") {
    throw new Error("Set MYRIAD_SEED_CONFIRM=local-demo-only for a disposable local database.");
  }
  let url;
  try {
    url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "");
  } catch {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL to a local Supabase endpoint.");
  }
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error("These tools only accept a loopback Supabase URL.");
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supply the service role key from your local Supabase instance.");
  }
  return { url: url.toString(), key: env.SUPABASE_SERVICE_ROLE_KEY };
}

/** @param {Record<string, string | undefined>} [env] */
export function requireDevMediaEnvironment(env = process.env) {
  requireLocalSeedEnvironment(env);
  if (env.MYRIAD_SEED_MEDIA_CONFIRM !== "dedicated-dev-library-only") {
    throw new Error("Media operations require a separate, explicitly confirmed development library.");
  }
  const apiKey = env.MYRIAD_SEED_BUNNY_API_KEY;
  const libraryId = env.MYRIAD_SEED_BUNNY_LIBRARY_ID;
  const cdnHostname = env.MYRIAD_SEED_BUNNY_CDN_HOSTNAME;
  if (!apiKey || !libraryId || !/^[0-9]+$/.test(libraryId) || !cdnHostname) {
    throw new Error("Supply MYRIAD_SEED_BUNNY_API_KEY, MYRIAD_SEED_BUNNY_LIBRARY_ID and MYRIAD_SEED_BUNNY_CDN_HOSTNAME for your development library.");
  }
  return { apiKey, libraryId, cdnHostname };
}

// Generated per account, never persisted in fixtures or printed by these tools.
export function newSeedPassword() {
  return randomBytes(32).toString("base64url") + "aA1!";
}

/** @param {string} email */
export function seedEmail(email) {
  if (typeof email !== "string" || !/^[a-z0-9._+-]+@example\.test$/i.test(email)) {
    throw new Error("Demo account addresses must use the reserved example.test domain.");
  }
  return email;
}
