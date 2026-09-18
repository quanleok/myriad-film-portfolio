# Myriad Film Platform

Next.js application for film discovery, creator dashboards, preorders, premieres and video delivery.

## Project overview

**Stack:** Next.js, React, TypeScript, Supabase, Stripe and Bunny Stream.

**Implemented work:** Film discovery, account and creator workflows, preorder and premiere flows, video delivery, service integrations and database access controls.

This is a portfolio source snapshot of an application under development. It does not include a production database, service credentials or deployed user accounts.

## Repository guide

- `src/app/` contains pages and API routes.
- `src/components/` contains interface components.
- `src/lib/` contains service integrations and shared logic.
- `supabase/migrations/` contains schema migrations for a new development database.
- `seed/` contains explicitly confirmed, local-only demo tools.
- `docs/portfolio-notes.md` explains the boundaries of this source snapshot.

## Development

Install the locked dependencies, copy `.env.example` to a private `.env.local`, and configure your own development services before running `npm run dev`. Use a disposable local Supabase instance and test payment settings. Optional Sentry telemetry requires your own `NEXT_PUBLIC_SENTRY_DSN`.

`npm run typecheck` checks TypeScript. `node --test seed/safety.test.mjs` checks the local seed safeguards without contacting a service. Browser tests require separately supplied test credentials.

Seed accounts use reserved example.test addresses and fresh random passwords that are not logged or saved in the fixtures. See `seed/README.md` before running a seed or cleanup command. Never use these tools against a deployed database.
