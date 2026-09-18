import { test, expect } from "@playwright/test";

const BASE = process.env.AUDIT_URL || "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. Preorder bottom sheet opens with correct content
// ---------------------------------------------------------------------------
test.describe("Preorder Bottom Sheet", () => {
  test("opens when clicking preorder button on explore card", async ({ page }) => {
    await page.goto(`${BASE}/explore`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Find a card with a preorder button (explore desktop grid has CTA buttons)
    const preorderBtn = page.locator("button").filter({ hasText: /Preorder/ }).first();
    const btnExists = await preorderBtn.isVisible().catch(() => false);
    test.skip(!btnExists, "No projects with preorder button available");

    await preorderBtn.click();
    await page.waitForTimeout(1000);

    // Bottom sheet should appear with "Preorder to Unlock" or "PREORDER TO UNLOCK"
    await expect(page.getByText(/Preorder to Unlock/i)).toBeVisible({ timeout: 5000 });
  });

  test("shows login CTA or Stripe Elements after opening", async ({ page }) => {
    await page.goto(`${BASE}/explore`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const preorderBtn = page.locator("button").filter({ hasText: /Preorder/ }).first();
    const btnExists = await preorderBtn.isVisible().catch(() => false);
    test.skip(!btnExists, "No projects with preorder button available");

    await preorderBtn.click();
    await page.waitForTimeout(2000);

    // Either login CTA or payment form should appear
    const loginCta = page.getByText(/Sign in to/i);
    const hasLoginCta = await loginCta.isVisible().catch(() => false);

    // If not logged in, should see sign-in prompt
    // If logged in, should see payment container or price info
    expect(hasLoginCta || await page.locator("text=/\\$\\d/").count() > 0).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Purchase bottom sheet for premiering/released
// ---------------------------------------------------------------------------
test.describe("Purchase Bottom Sheet", () => {
  test("opens in purchase mode on released project", async ({ page }) => {
    await page.goto(`${BASE}/browse?status=released`, { waitUntil: "networkidle" });

    const buyBtn = page.locator("button").filter({ hasText: /Buy Access/ }).first();
    const btnExists = await buyBtn.isVisible().catch(() => false);
    test.skip(!btnExists, "No released projects with purchase button available");

    await buyBtn.click();

    // Bottom sheet should show "Buy Access" header
    const bottomSheet = page.locator('[class*="fixed inset-0"]').first();
    await expect(bottomSheet).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Buy Access")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Bottom sheet for logged-out user
// ---------------------------------------------------------------------------
test.describe("Logged-out Bottom Sheet", () => {
  test("shows login CTA instead of payment form", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/explore`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const preorderBtn = page.locator("button").filter({ hasText: /Preorder/ }).first();
    const btnExists = await preorderBtn.isVisible().catch(() => false);
    test.skip(!btnExists, "No projects with preorder button available");

    await preorderBtn.click();
    await page.waitForTimeout(2000);

    // Should show sign-in prompt (use .first() since there may be both text and button)
    await expect(page.getByText(/Sign in to/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4. Project page CTA buttons by lifecycle status
// ---------------------------------------------------------------------------
test.describe("Project Page CTA", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("unlocking project shows 'Preorder to Unlock'", async ({ page, request }) => {
    const res = await request.get(`${BASE}/api/projects/browse?status=unlocking&limit=1`);
    const data = await res.json();
    const project = data.projects?.[0];
    test.skip(!project, "No unlocking projects available");

    await page.goto(`${BASE}/project/${project.slug ?? project.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // On desktop the CTA is in the sidebar; on mobile it's in the sticky bottom bar
    const cta = page.locator("button, a").filter({ hasText: /Preorder/i }).first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });

  test("in_production project shows 'Preorder'", async ({ page, request }) => {
    const res = await request.get(`${BASE}/api/projects/browse?status=in_production&limit=1`);
    const data = await res.json();
    const project = data.projects?.[0];
    test.skip(!project, "No in_production projects available");

    await page.goto(`${BASE}/project/${project.slug ?? project.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const ctaButton = page.locator("button").filter({ hasText: /Preorder/ }).first();
    await expect(ctaButton).toBeVisible({ timeout: 10000 });
  });

  test("released project without access shows 'Buy Access' or 'Watch'", async ({ page, request }) => {
    await page.context().clearCookies();
    const res = await request.get(`${BASE}/api/projects/browse?status=released&limit=1`);
    const data = await res.json();
    const project = data.projects?.[0];
    test.skip(!project, "No released projects available");

    await page.goto(`${BASE}/project/${project.slug ?? project.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const watchCta = page.locator("button").filter({ hasText: /Watch|Buy Access/ }).first();
    await expect(watchCta).toBeVisible({ timeout: 10000 });
  });

  test("failed_to_unlock project shows 'Follow for Relaunch'", async ({ page, request }) => {
    const res = await request.get(`${BASE}/api/projects/browse?status=failed_to_unlock&limit=1`);
    const data = await res.json();
    const project = data.projects?.[0];
    test.skip(!project, "No failed_to_unlock projects available");

    await page.goto(`${BASE}/project/${project.slug ?? project.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // CTA should say "Follow for Relaunch" in sidebar or sticky bar
    const cta = page.locator("button, a").filter({ hasText: /Follow for Relaunch/i }).first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 5. Cancel preorder during unlocking
// ---------------------------------------------------------------------------
test.describe("Cancel Preorder", () => {
  test("cancel button visible for preordered unlocking project", async ({ page }) => {
    // This test requires a logged-in user with an active preorder
    // Skip if not authenticated
    await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
    const redirectedToLogin = page.url().includes("/login");
    test.skip(redirectedToLogin, "Not authenticated — cannot test cancel preorder");

    // Look for any preorder with cancel option
    const cancelBtn = page.locator("button").filter({ hasText: /Cancel|Refund/ }).first();
    const hasCancelBtn = await cancelBtn.isVisible().catch(() => false);
    test.skip(!hasCancelBtn, "No cancellable preorders found");

    // Just verify the button is present
    await expect(cancelBtn).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 6. Self-serve refund for overdue projects
// ---------------------------------------------------------------------------
test.describe("Self-serve Refund", () => {
  test("overdue project shows refund button for backers", async ({ page }) => {
    // Requires logged-in user who backed an overdue project
    await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
    const redirectedToLogin = page.url().includes("/login");
    test.skip(redirectedToLogin, "Not authenticated — cannot test self-serve refund");

    // Look for overdue/refund indicators
    const refundBtn = page.locator("button").filter({ hasText: /Refund|Request Refund/ }).first();
    const hasRefund = await refundBtn.isVisible().catch(() => false);
    test.skip(!hasRefund, "No overdue projects with refund option found");

    await expect(refundBtn).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 7. Preorder API response shape
// ---------------------------------------------------------------------------
test.describe("Preorder API", () => {
  test("POST /api/preorders returns correct shape or 401", async ({ request }) => {
    const response = await request.post(`${BASE}/api/preorders`, {
      data: { projectId: "00000000-0000-0000-0000-000000000000" },
      headers: { "Content-Type": "application/json" },
    });

    // Should be 401 (not authenticated) or 404 (project not found) — not 500
    expect([401, 403, 404]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("POST /api/preorders without projectId returns 400", async ({ request }) => {
    const response = await request.post(`${BASE}/api/preorders`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    });

    // 400 (missing projectId) or 401 (not auth)
    expect([400, 401]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// 8. Purchase API response shape
// ---------------------------------------------------------------------------
test.describe("Purchase API", () => {
  test("POST /api/purchases returns correct shape or auth error", async ({ request }) => {
    const response = await request.post(`${BASE}/api/purchases`, {
      data: { projectId: "00000000-0000-0000-0000-000000000000" },
      headers: { "Content-Type": "application/json" },
    });

    expect([401, 403, 404]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ---------------------------------------------------------------------------
// 9. Webhook endpoint accepts valid event shape
// ---------------------------------------------------------------------------
test.describe("Webhook Endpoint", () => {
  test("POST /api/webhooks/stripe returns 400 without signature", async ({ request }) => {
    const response = await request.post(`${BASE}/api/webhooks/stripe`, {
      data: JSON.stringify({ type: "test", data: {} }),
      headers: { "Content-Type": "text/plain" },
    });

    // Should return 400 for missing stripe-signature (not 500)
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("stripe-signature");
  });

  test("POST /api/webhooks/stripe returns 400 for invalid signature", async ({ request }) => {
    const response = await request.post(`${BASE}/api/webhooks/stripe`, {
      data: JSON.stringify({ id: "evt_test", type: "payment_intent.succeeded", data: { object: {} } }),
      headers: {
        "Content-Type": "text/plain",
        "stripe-signature": "t=1234567890,v1=invalid_signature",
      },
    });

    expect(response.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 10. Failed/cancelled projects show no CTA
// ---------------------------------------------------------------------------
test.describe("No CTA for failed/cancelled", () => {
  test("failed_to_unlock card has no preorder/buy button", async ({ page }) => {
    await page.goto(`${BASE}/browse?status=failed_to_unlock`, { waitUntil: "networkidle" });

    const cards = page.locator('a[href^="/project/"]');
    const cardCount = await cards.count();
    test.skip(cardCount === 0, "No failed_to_unlock projects in browse");

    // Within the first card, there should be no preorder/buy button
    const firstCard = cards.first();
    const ctaBtn = firstCard.locator("button").filter({ hasText: /Preorder|Buy Access/ });
    expect(await ctaBtn.count()).toBe(0);
  });

  test("cancelled project card has no preorder/buy button", async ({ page }) => {
    await page.goto(`${BASE}/browse?status=cancelled`, { waitUntil: "networkidle" });

    const cards = page.locator('a[href^="/project/"]');
    const cardCount = await cards.count();
    test.skip(cardCount === 0, "No cancelled projects in browse");

    const firstCard = cards.first();
    const ctaBtn = firstCard.locator("button").filter({ hasText: /Preorder|Buy Access/ });
    expect(await ctaBtn.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 11. Price display on cards
// ---------------------------------------------------------------------------
test.describe("Price Display", () => {
  test("unlocking card shows preorder price", async ({ page }) => {
    await page.goto(`${BASE}/browse?status=unlocking`, { waitUntil: "networkidle" });

    const preorderBtn = page.locator("button").filter({ hasText: /Preorder.*\$/ }).first();
    const btnExists = await preorderBtn.isVisible().catch(() => false);
    test.skip(!btnExists, "No unlocking project cards with price");

    const text = await preorderBtn.textContent();
    expect(text).toMatch(/\$\d+/);
  });

  test("released card shows release price", async ({ page }) => {
    await page.goto(`${BASE}/browse?status=released`, { waitUntil: "networkidle" });

    const buyBtn = page.locator("button").filter({ hasText: /Buy Access.*\$/ }).first();
    const btnExists = await buyBtn.isVisible().catch(() => false);
    test.skip(!btnExists, "No released project cards with buy price");

    const text = await buyBtn.textContent();
    expect(text).toMatch(/\$\d+/);
  });

  test("in_production card shows preorder price", async ({ page }) => {
    await page.goto(`${BASE}/browse?status=in_production`, { waitUntil: "networkidle" });

    const preorderBtn = page.locator("button").filter({ hasText: /Preorder.*\$/ }).first();
    const btnExists = await preorderBtn.isVisible().catch(() => false);
    test.skip(!btnExists, "No in_production project cards with price");

    const text = await preorderBtn.textContent();
    expect(text).toMatch(/\$\d+/);
  });
});
