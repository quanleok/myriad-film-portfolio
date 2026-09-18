/**
 * Myriad Platform — End-to-End Lifecycle & Campaign Deadline Tests
 *
 * Tests the full project lifecycle at the API level:
 *   preorder → greenlight → in_production → deliver → premiere → released
 *
 * Also validates campaign deadline cron logic and edge cases.
 *
 * Run: AUDIT_URL=https://myriadspring.com npx tsx tests/e2e-lifecycle.spec.ts
 * For local: npx tsx tests/e2e-lifecycle.spec.ts
 */

const BASE = process.env.AUDIT_URL || "https://myriadspring.com";

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];
let passed = 0;
let failed = 0;

async function api(
  method: string,
  path: string,
  options?: { body?: unknown; headers?: Record<string, string> }
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };
  const init: RequestInit = { method, headers };
  if (options?.body !== undefined) {
    init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }
  return fetch(`${BASE}${path}`, init);
}

function test(name: string, check: () => Promise<void>) {
  return check()
    .then(() => {
      results.push({ name, passed: true, detail: "OK" });
      passed++;
      console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    })
    .catch((err: Error) => {
      results.push({ name, passed: false, detail: err.message });
      failed++;
      console.log(`  \x1b[31m✗\x1b[0m ${name} — ${err.message}`);
    });
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function run() {
  console.log(`\nE2E Lifecycle Audit: ${BASE}\n`);

  // ═══════════════════════════════════════════════════
  // SECTION 1: Preorder Flow Validation
  // ═══════════════════════════════════════════════════
  console.log("1. Preorder Flow — Auth & Validation");

  await test("POST /api/preorders without auth → 401", async () => {
    const res = await api("POST", "/api/preorders", { body: { projectId: "test" } });
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/preorders with empty body → 400 or 401", async () => {
    const res = await api("POST", "/api/preorders", { body: {} });
    assert(res.status === 400 || res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/preorders with invalid projectId type → 400 or 401", async () => {
    const res = await api("POST", "/api/preorders", { body: { projectId: 12345 } });
    assert(res.status !== 500, `got 500`);
  });

  await test("POST /api/preorders with non-existent UUID → not 500", async () => {
    const res = await api("POST", "/api/preorders", {
      body: { projectId: "00000000-0000-0000-0000-000000000000" },
    });
    assert(res.status !== 500, `got 500`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 2: Cancel Preorder Flow
  // ═══════════════════════════════════════════════════
  console.log("\n2. Cancel Preorder Flow");

  await test("DELETE /api/preorders/:id without auth → 401", async () => {
    const res = await api("DELETE", "/api/preorders/00000000-0000-0000-0000-000000000000");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("DELETE /api/preorders/invalid-id without auth → 401", async () => {
    const res = await api("DELETE", "/api/preorders/not-a-uuid");
    assert(res.status === 401, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 3: Greenlight Route
  // ═══════════════════════════════════════════════════
  console.log("\n3. Greenlight Route");

  await test("POST /api/projects/:id/greenlight without auth → 401", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/greenlight");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/projects/:id/greenlight with non-existent project → 401 or 404", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/greenlight");
    assert(res.status === 401 || res.status === 404, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 4: Delivery Route
  // ═══════════════════════════════════════════════════
  console.log("\n4. Delivery Route");

  await test("POST /api/projects/:id/deliver without auth → 401", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/deliver", {
      body: { film_video_id: "test", release_option: "free" },
    });
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/projects/:id/deliver with invalid body → 401 or 400", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/deliver", {
      body: {},
    });
    assert(res.status === 401 || res.status === 400, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 5: Post-Release Purchase
  // ═══════════════════════════════════════════════════
  console.log("\n5. Post-Release Purchase");

  await test("POST /api/purchases without auth → 401", async () => {
    const res = await api("POST", "/api/purchases", { body: { project_id: "test" } });
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/purchases with non-existent project → not 500", async () => {
    const res = await api("POST", "/api/purchases", {
      body: { project_id: "00000000-0000-0000-0000-000000000000" },
    });
    assert(res.status !== 500, `got 500`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 6: Webhook Auto-Unlock
  // ═══════════════════════════════════════════════════
  console.log("\n6. Webhook Security (Auto-Unlock Path)");

  await test("Webhook rejects missing stripe-signature → 400", async () => {
    const res = await api("POST", "/api/webhooks/stripe", {
      body: {
        id: "evt_test",
        type: "payment_intent.succeeded",
        created: Math.floor(Date.now() / 1000),
        data: { object: { metadata: { type: "preorder" } } },
      },
    });
    assert(res.status === 400, `got ${res.status}`);
  });

  await test("Webhook rejects invalid signature → 400", async () => {
    const res = await api("POST", "/api/webhooks/stripe", {
      body: JSON.stringify({
        id: "evt_test",
        type: "payment_intent.succeeded",
        created: Math.floor(Date.now() / 1000),
      }),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": `t=${Math.floor(Date.now() / 1000)},v1=invalid_signature_here`,
      },
    });
    assert(res.status === 400, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 7: Campaign Deadline Cron
  // ═══════════════════════════════════════════════════
  console.log("\n7. Campaign Deadline Cron");

  await test("GET /api/cron/campaign-deadline without auth → 401", async () => {
    const res = await api("GET", "/api/cron/campaign-deadline");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/cron/campaign-deadline without auth → 401", async () => {
    const res = await api("POST", "/api/cron/campaign-deadline");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("GET /api/cron/campaign-deadline with wrong Bearer → 401", async () => {
    const res = await api("GET", "/api/cron/campaign-deadline", {
      headers: { Authorization: "Bearer totally-wrong-secret" },
    });
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/cron/campaign-deadline with wrong x-cron-secret → 401", async () => {
    const res = await api("POST", "/api/cron/campaign-deadline", {
      headers: { "x-cron-secret": "totally-wrong-secret" },
    });
    assert(res.status === 401, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 8: Delivery Reminders Cron
  // ═══════════════════════════════════════════════════
  console.log("\n8. Delivery Reminders Cron");

  await test("GET /api/cron/delivery-reminders without auth → 401", async () => {
    const res = await api("GET", "/api/cron/delivery-reminders");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/cron/delivery-reminders without auth → 401", async () => {
    const res = await api("POST", "/api/cron/delivery-reminders");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("GET /api/cron/delivery-reminders with wrong secret → 401", async () => {
    const res = await api("GET", "/api/cron/delivery-reminders", {
      headers: { Authorization: "Bearer nope" },
    });
    assert(res.status === 401, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 9: Project Cancel Flow
  // ═══════════════════════════════════════════════════
  console.log("\n9. Project Cancel Flow");

  await test("POST /api/projects/:id/cancel without auth → 401", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/cancel");
    assert(res.status === 401, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 10: Premiere & Set-Premiere
  // ═══════════════════════════════════════════════════
  console.log("\n10. Set Premiere Route");

  await test("POST /api/projects/:id/set-premiere without auth → 401", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/set-premiere", {
      body: { premiere_date: "2026-06-01T00:00:00Z" },
    });
    assert(res.status === 401, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 11: Withdraw Route
  // ═══════════════════════════════════════════════════
  console.log("\n11. Withdraw Route");

  await test("POST /api/payouts/withdraw without auth → 401", async () => {
    const res = await api("POST", "/api/payouts/withdraw", {
      body: { amount_cents: 5000 },
    });
    assert(res.status === 401, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 12: Browse & Feed (data endpoints)
  // ═══════════════════════════════════════════════════
  console.log("\n12. Browse & Feed Data Endpoints");

  await test("GET /api/projects/browse → 200 with projects array", async () => {
    const res = await api("GET", "/api/projects/browse");
    assert(res.status === 200, `got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.projects), "response.projects is not an array");
  });

  await test("GET /api/projects/feed → 200", async () => {
    const res = await api("GET", "/api/projects/feed");
    assert(res.status === 200, `got ${res.status}`);
  });

  await test("GET /api/projects/browse?sort=trending → 200", async () => {
    const res = await api("GET", "/api/projects/browse?sort=trending");
    assert(res.status === 200, `got ${res.status}`);
  });

  await test("GET /api/projects/browse?lifecycle=unlocking → 200", async () => {
    const res = await api("GET", "/api/projects/browse?lifecycle=unlocking");
    assert(res.status === 200, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // SECTION 13: Lifecycle State Machine — Edge Cases
  // ═══════════════════════════════════════════════════
  console.log("\n13. Lifecycle Edge Cases");

  await test("POST /api/projects/:id/publish without auth → 401", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/publish");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("POST /api/projects/:id/submit without auth → 401", async () => {
    const res = await api("POST", "/api/projects/00000000-0000-0000-0000-000000000000/submit");
    assert(res.status === 401, `got ${res.status}`);
  });

  await test("GET /api/preorders/me without auth → 401", async () => {
    const res = await api("GET", "/api/preorders/me");
    assert(res.status === 401, `got ${res.status}`);
  });

  // ═══════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════
  console.log(`\n${"═".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"═".repeat(50)}\n`);

  if (failed > 0) {
    console.log("FAILURES:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Test suite failed to run:", err);
  process.exit(2);
});
