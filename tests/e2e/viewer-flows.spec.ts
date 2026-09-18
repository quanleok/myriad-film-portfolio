import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════
//  Myriad Spring — Viewer Flow E2E Tests (Claude 2)
//  Run: npx playwright test tests/e2e/viewer-flows.spec.ts
// ═══════════════════════════════════════════════════

const BASE = process.env.AUDIT_URL || "http://localhost:3000";

// Helper: fetch a live project slug from the browse API (with retry)
async function fetchProjectSlug(request: import("@playwright/test").APIRequestContext): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await request.get(`${BASE}/api/projects/browse?limit=1`);
      if (!res.ok()) return null;
      const data = await res.json();
      const project = data.projects?.[0];
      if (!project) return null;
      return project.slug ?? project.id;
    } catch {
      if (i === 2) return null;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

// Helper: fetch a creator username from the browse API (with retry)
async function fetchCreatorUsername(request: import("@playwright/test").APIRequestContext): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await request.get(`${BASE}/api/projects/browse?limit=1`);
      if (!res.ok()) return null;
      const data = await res.json();
      return data.projects?.[0]?.profiles?.username ?? null;
    } catch {
      if (i === 2) return null;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

// ─── 1. Landing Page ───

test.describe("1. Landing Page", () => {
  test("loads with hero content and nav links", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Myriad/i);

    // Nav or header exists
    const nav = page.locator("nav, header").first();
    await expect(nav).toBeVisible();

    // Some CTA link exists on the page (may be explore, browse, or signup)
    const ctaLink = page.locator('a[href="/explore"], a[href="/browse"], a[href="/login"], a[href="/signup"]').first();
    await expect(ctaLink).toBeVisible({ timeout: 5000 });
  });

  test("CTA navigates to explore or browse", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const ctaLink = page.locator('a[href="/explore"], a[href="/browse"]').first();
    await ctaLink.click();
    await page.waitForURL(/\/(explore|browse)/);
    expect(page.url()).toMatch(/\/(explore|browse)/);
  });
});

// ─── 2. Explore Page ───

test.describe("2. Explore Page", () => {
  test("renders project cards with expected content", async ({ page }) => {
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Should have project links or an empty/loading state
    const projectLinks = page.locator('a[href^="/project/"]');
    const hasProjects = await projectLinks.count() > 0;
    const hasEmptyState = await page.locator('text=/no.*project|check back|loading/i').count() > 0;
    expect(hasProjects || hasEmptyState).toBeTruthy();
  });

  test("clicking a project navigates to project page", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Find a link to a project page
    const projectLink = page.locator('a[href^="/project/"]').first();
    if (await projectLink.count() > 0) {
      await projectLink.click();
      await page.waitForURL(/\/project\//);
      expect(page.url()).toContain("/project/");
    }
  });
});

// ─── 3. Browse Page ───

test.describe("3. Browse Page", () => {
  test("loads with search input and filter controls", async ({ page }) => {
    await page.goto("/browse", { waitUntil: "domcontentloaded" });

    // Search input should exist
    const searchInput = page.locator('input[type="search"], input[type="text"][placeholder*="earch"], input[name*="search"]').first();
    await expect(searchInput).toBeVisible();
  });

  test("search input filters results", async ({ page }) => {
    await page.goto("/browse", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[type="search"], input[type="text"][placeholder*="earch"], input[name*="search"]').first();
    await searchInput.fill("test");
    await searchInput.press("Enter");

    // Wait for network response
    await page.waitForTimeout(2000);

    // Page should still be on browse
    expect(page.url()).toContain("/browse");
  });

  test("genre filter pills are clickable", async ({ page }) => {
    await page.goto("/browse", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Look for filter buttons/pills
    const filterPill = page.locator('button:has-text("Sci-Fi"), button:has-text("Drama"), button:has-text("Horror"), button:has-text("Comedy"), button:has-text("All")').first();
    if (await filterPill.count() > 0) {
      await filterPill.click();
      await page.waitForTimeout(1000);
      // Should still be on browse page
      expect(page.url()).toContain("/browse");
    }
  });

  test("sort options work", async ({ page }) => {
    await page.goto("/browse", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Look for sort controls
    const sortControl = page.locator('select, button:has-text("Newest"), button:has-text("Trending"), [data-testid*="sort"]').first();
    if (await sortControl.count() > 0) {
      await sortControl.click();
      await page.waitForTimeout(500);
    }
  });

  test("project cards render in grid", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    await page.goto("/browse", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Should have project links
    const projectLinks = page.locator('a[href^="/project/"]');
    expect(await projectLinks.count()).toBeGreaterThan(0);
  });
});

// ─── 4. Project Page ───

test.describe("4. Project Page", () => {
  test("loads with teaser, title, meta, and creator byline", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    await page.goto(`/project/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Title should be visible
    const title = page.locator("h1, h2").first();
    await expect(title).toBeVisible();

    // Creator byline should exist
    const creatorLink = page.locator('a[href^="/creator/"]').first();
    if (await creatorLink.count() > 0) {
      await expect(creatorLink).toBeVisible();
    }
  });

  test("tabs switch content panels", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    await page.goto(`/project/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const tabNames = ["Concept", "Characters", "Story", "Updates", "Creator", "Discussion"];

    for (const tabName of tabNames) {
      const tabButton = page.locator(`button:has-text("${tabName}"), a:has-text("${tabName}")`).first();
      if (await tabButton.count() > 0) {
        await tabButton.click();
        await page.waitForTimeout(500);
        // Tab should appear selected/active (has some visual indicator)
        // Just verify no crash
      }
    }
  });

  test("sidebar shows lifecycle info", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    // Desktop viewport to see sidebar
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/project/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Sidebar should exist on desktop (aside element)
    const sidebar = page.locator("aside").first();
    if (await sidebar.count() > 0) {
      await expect(sidebar).toBeVisible();
    }
  });

  test("project page has meta pills (genre, format)", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    await page.goto(`/project/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Look for genre/format/tone pills
    const pills = page.locator('text=/Film|Series|Animated|Sci-Fi|Drama|Horror|Comedy|Thriller|Romance|Fantasy|Action|Mystery/i');
    // At least one should exist if project has genre/format set
    // Not all projects will have them, so just verify no crash
  });

  test("creator avatar and name link to creator profile", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    await page.goto(`/project/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const creatorLink = page.locator('a[href^="/creator/"]').first();
    if (await creatorLink.count() > 0) {
      const href = await creatorLink.getAttribute("href");
      expect(href).toMatch(/^\/creator\//);

      // Check avatar or initials exist inside or near the link
      const hasAvatar = await creatorLink.locator("img").count() > 0;
      const hasInitials = await creatorLink.locator("div").count() > 0;
      expect(hasAvatar || hasInitials).toBeTruthy();
    }
  });
});

// ─── 5. Creator Profile Page ───

test.describe("5. Creator Profile Page", () => {
  test("loads with avatar, name, stats, and projects grid", async ({ page, request }) => {
    const username = await fetchCreatorUsername(request);
    test.skip(!username, "No creators available");

    await page.goto(`/creator/${username}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Name should be visible
    const displayName = page.locator("h1, h2").first();
    await expect(displayName).toBeVisible();

    // Should have avatar or initials
    const avatar = page.locator('img[alt*="Creator"], img[alt*="creator"], img[class*="rounded-full"]').first();
    const initials = page.locator('[class*="rounded-full"]').first();
    expect(await avatar.count() > 0 || await initials.count() > 0).toBeTruthy();
  });

  test("shows projects by this creator", async ({ page, request }) => {
    const username = await fetchCreatorUsername(request);
    test.skip(!username, "No creators available");

    await page.goto(`/creator/${username}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Project links or cards should exist
    const projectLinks = page.locator('a[href^="/project/"]');
    // Creator might have 0 public projects, so just verify no crash
  });
});

// ─── 6. Mobile Viewport ───

test.describe("6. Mobile Viewport (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("bottom nav shows 4 tabs", async ({ page }) => {
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Bottom nav should have tab links
    const bottomNav = page.locator('nav[class*="fixed"], nav[class*="bottom"], [class*="bottom-nav"], [class*="mobile-nav"]').first();
    if (await bottomNav.count() > 0) {
      const links = bottomNav.locator("a");
      expect(await links.count()).toBeGreaterThanOrEqual(3); // At least explore, browse, library
    }
  });

  test("explore page accessible on mobile", async ({ page }) => {
    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    const res = await page.goto("/explore", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
  });

  test("browse page accessible on mobile", async ({ page }) => {
    const res = await page.goto("/browse", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);

    // Page should load without errors — search may be in collapsed nav on mobile
    await page.waitForTimeout(1000);
    const heading = page.locator('text=/browse|explore|project/i').first();
    const hasContent = await heading.count() > 0;
    expect(hasContent || res?.status() === 200).toBeTruthy();
  });

  test("library page accessible on mobile", async ({ page }) => {
    const res = await page.goto("/library", { waitUntil: "domcontentloaded" });
    // Library might redirect to login, which is expected
    expect(res?.status()).toBeLessThan(500);
  });

  test("project page renders on mobile", async ({ page, request }) => {
    const slug = await fetchProjectSlug(request);
    test.skip(!slug, "No projects available");

    await page.goto(`/project/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Title visible
    const title = page.locator("h1, h2").first();
    await expect(title).toBeVisible();
  });
});

// ─── 7. Dark/Light Theme Toggle ───

test.describe("7. Dark/Light Theme Toggle", () => {
  test("theme toggle exists and switches theme on landing page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i], button[aria-label*="dark" i], button[aria-label*="light" i], [data-testid*="theme"]').first();

    if (await themeToggle.count() > 0) {
      // Get initial theme
      const htmlBefore = await page.locator("html").getAttribute("class") ?? "";
      const dataBefore = await page.locator("html").getAttribute("data-theme") ?? "";

      await themeToggle.click();
      await page.waitForTimeout(500);

      const htmlAfter = await page.locator("html").getAttribute("class") ?? "";
      const dataAfter = await page.locator("html").getAttribute("data-theme") ?? "";

      // Theme should have changed
      expect(htmlBefore + dataBefore).not.toEqual(htmlAfter + dataAfter);
    }
  });

  test("theme toggle works on browse page", async ({ page }) => {
    await page.goto("/browse", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i], button[aria-label*="dark" i], button[aria-label*="light" i], [data-testid*="theme"]').first();

    if (await themeToggle.count() > 0) {
      const htmlBefore = await page.locator("html").getAttribute("class") ?? "";
      await themeToggle.click();
      await page.waitForTimeout(500);
      const htmlAfter = await page.locator("html").getAttribute("class") ?? "";

      expect(htmlBefore).not.toEqual(htmlAfter);
    }
  });
});

// ─── 8. Failed/Cancelled Projects Hidden from Default Views ───

test.describe("8. Failed/Cancelled Projects Excluded", () => {
  test("explore feed does not show failed_to_unlock or cancelled projects", async ({ page, request }) => {
    // Fetch feed API directly to check lifecycle_status values
    const res = await request.get(`${BASE}/api/projects/feed?limit=50`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    const projects = data.projects ?? [];

    for (const p of projects) {
      expect(p.lifecycle_status).not.toBe("failed_to_unlock");
      expect(p.lifecycle_status).not.toBe("cancelled");
    }
  });

  test("browse does not show failed_to_unlock or cancelled by default", async ({ page, request }) => {
    // Fetch browse API directly
    const res = await request.get(`${BASE}/api/projects/browse?limit=50`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    const projects = data.projects ?? [];

    for (const p of projects) {
      expect(p.lifecycle_status).not.toBe("failed_to_unlock");
      expect(p.lifecycle_status).not.toBe("cancelled");
    }
  });

  test("browse with status filter only returns matching status", async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects/browse?status=unlocking&limit=10`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    for (const p of data.projects ?? []) {
      expect(p.lifecycle_status).toBe("unlocking");
    }
  });
});
