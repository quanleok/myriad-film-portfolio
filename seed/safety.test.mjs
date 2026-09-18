import test from "node:test";
import assert from "node:assert/strict";
import { requireLocalSeedEnvironment, requireDevMediaEnvironment, newSeedPassword, seedEmail } from "./safety.mjs";

const local = {
  MYRIAD_SEED_CONFIRM: "local-demo-only",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "unused-local-test-value",
};

test("seed tools reject missing confirmation, production mode and remote targets", () => {
  assert.throws(() => requireLocalSeedEnvironment({}), /CONFIRM/);
  assert.throws(() => requireLocalSeedEnvironment({ ...local, NODE_ENV: "production" }), /production/);
  for (const url of ["https://project.supabase.co", "https://localhost.example.com", "http://127.0.0.1@remote.example", "http://localhost:54321/?redirect=remote"]) {
    assert.throws(() => requireLocalSeedEnvironment({ ...local, NEXT_PUBLIC_SUPABASE_URL: url }));
  }
  assert.throws(() => requireLocalSeedEnvironment({ ...local, SUPABASE_SERVICE_ROLE_KEY: "" }), /service role/);
});

test("explicit disposable loopback targets are accepted", () => {
  for (const url of ["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321"]) {
    assert.equal(requireLocalSeedEnvironment({ ...local, NEXT_PUBLIC_SUPABASE_URL: url }).key, local.SUPABASE_SERVICE_ROLE_KEY);
  }
});

test("media tooling cannot inherit regular production media credentials", () => {
  assert.throws(() => requireDevMediaEnvironment({ ...local, BUNNY_API_KEY: "unused-production-test-value" }), /development library/);
  assert.throws(() => requireDevMediaEnvironment({ ...local, MYRIAD_SEED_MEDIA_CONFIRM: "dedicated-dev-library-only" }), /MYRIAD_SEED_BUNNY_API_KEY/);
  assert.equal(requireDevMediaEnvironment({
    ...local,
    MYRIAD_SEED_MEDIA_CONFIRM: "dedicated-dev-library-only",
    MYRIAD_SEED_BUNNY_API_KEY: "unused-development-test-value",
    MYRIAD_SEED_BUNNY_LIBRARY_ID: "123",
    MYRIAD_SEED_BUNNY_CDN_HOSTNAME: "media.example.test",
  }).libraryId, "123");
});

test("fixture emails are reserved examples and generated passwords are unpredictable", () => {
  assert.equal(seedEmail("demo@example.test"), "demo@example.test");
  assert.throws(() => seedEmail("demo@example.com"), /example.test/);
  const passwords = new Set(Array.from({ length: 64 }, () => newSeedPassword()));
  assert.equal(passwords.size, 64);
  assert.ok([...passwords].every(value => value.length >= 43));
});
