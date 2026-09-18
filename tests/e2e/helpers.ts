import type { Page } from "@playwright/test";

/**
 * Shared test helpers for Myriad E2E tests.
 *
 * Auth helpers are stubs — fill in real credentials via env vars
 * or Supabase test user setup when available.
 */

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const TEST_CREATOR_EMAIL = process.env.TEST_CREATOR_EMAIL;
const TEST_CREATOR_PASSWORD = process.env.TEST_CREATOR_PASSWORD;

/**
 * Login as a regular user via the /login page.
 * TODO: Wire up to real Supabase test credentials.
 */

function requireTestCredentials(email?: string, password?: string) {
  if (!email || !password) {
    throw new Error("Provide test credentials through the environment for a disposable test instance.");
  }
  return { email, password };
}

export async function loginAsUser(page: Page, email?: string, password?: string) {
  const credentials = requireTestCredentials(email ?? TEST_USER_EMAIL, password ?? TEST_USER_PASSWORD);
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');

  if ((await emailInput.count()) === 0) {
    // Login page may not have standard form — skip silently
    console.warn("[helpers] Login form not found, skipping login");
    return false;
  }

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");

  // Check if login succeeded (not still on /login)
  return !page.url().includes("/login");
}

/**
 * Login as an admin user.
 * TODO: Requires a Supabase user with is_admin=true in test DB.
 */
export async function loginAsAdmin(page: Page) {
  const credentials = requireTestCredentials(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
  return loginAsUser(page, credentials.email, credentials.password);
}

/**
 * Login as a creator user.
 * TODO: Requires a Supabase user with is_creator=true in test DB.
 */
export async function loginAsCreator(page: Page) {
  const credentials = requireTestCredentials(TEST_CREATOR_EMAIL, TEST_CREATOR_PASSWORD);
  return loginAsUser(page, credentials.email, credentials.password);
}

/**
 * Wait for page to be fully interactive (no loading spinners).
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle");
  // Wait for any Loading... text to disappear
  const loading = page.getByText("Loading...");
  if ((await loading.count()) > 0) {
    await loading.first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  }
}
