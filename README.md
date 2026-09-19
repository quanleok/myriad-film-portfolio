# Myriad Film Platform

Next.js application for film discovery, creator dashboards, preorders, premieres and video delivery.

**Public portfolio source:** [quanleok/myriad-film-portfolio](https://github.com/quanleok/myriad-film-portfolio)

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
- [Portfolio notes](docs/portfolio-notes.md) explain the boundaries of this source snapshot.

## Development

Install the locked dependencies with `npm ci`, copy `.env.example` to a private `.env.local`, and configure your own development services before running `npm run dev`. Use a disposable local Supabase instance and test payment settings. Optional Sentry telemetry requires your own `NEXT_PUBLIC_SENTRY_DSN`.

`npm run typecheck` checks TypeScript. `node --test seed/safety.test.mjs` checks the local seed safeguards without contacting a service. Browser tests require separately supplied test credentials.

Seed accounts use reserved example.test addresses and fresh random passwords that are not logged or saved in the fixtures. Tools reject production mode and non-loopback database URLs, and require explicit confirmation. Media tools additionally require separate credentials for a dedicated development library. See the [seed guide](seed/README.md) before running a seed or cleanup command. Never use these tools against a deployed database.

## Source boundary

Private account data, captured sessions, operational documents and one-off production utilities are excluded. Some migration slots intentionally omit internal sample accounts while preserving application schema; apply this migration set only to a new portfolio development database. External video rights, provider onboarding and production readiness are not supplied by this source snapshot.
