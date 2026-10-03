## Why

BarberOS now has the functional MVP surface, but it still needs production hardening before it can be operated safely for real tenants. This change turns the remaining roadmap epic into release-ready behavior: validation gates, tenant-isolation confidence, structured observability, operational security, deploy readiness and incident runbooks.

## What Changes

- Add production readiness gates that group format, lint, typecheck, unit/integration tests, migration validators, client-secret checks, E2E coverage and production builds.
- Add critical E2E/readiness coverage for the PRD flows: agenda to payment and commission, walk-in to stock and finance, and WhatsApp/AI to appointment.
- Harden tenant-isolation, authorization and RLS checks across modules with a reusable audit matrix and focused tests for cross-tenant reads/writes.
- Introduce web/worker/AI observability conventions for structured logs, request/correlation ids, sanitized errors and safe metadata.
- Add rate-limit and anti-abuse readiness checks for sensitive surfaces such as auth, AI, public booking, WhatsApp/campaigns, search and webhooks.
- Add deployment readiness artifacts for Vercel, Railway, Supabase and Redis environments, including required environment variables and secret-boundary validation.
- Add operational runbooks for payment, WhatsApp, worker, tenant-isolation, database restore and platform-support incidents.

## Capabilities

### New Capabilities

- `production-readiness`: production validation, observability, security hardening, deploy readiness and operational runbooks for the MVP.

### Modified Capabilities

- `identity-access`: extends server-side access behavior with production tenant-isolation audit coverage and rate-limit requirements for sensitive access paths.
- `application-shell`: extends protected UI readiness with production accessibility, offline/error behavior and critical E2E coverage expectations.

## Impact

- Affected code: validation scripts, test suites, E2E specs, logging/observability helpers, route/middleware hardening, CI workflow, deployment documentation and runbooks.
- Affected systems: `apps/web`, `apps/worker`, `apps/ai`, `packages/contracts`, `packages/permissions`, Supabase migrations/RLS, GitHub Actions, Vercel, Railway, Supabase and Redis.
- Dependencies: existing Vitest, Playwright, axe, OpenSpec, migration validators and secret scanning scripts.
