---
name: barberos-quality
description: Use when adding tests, reviewing BarberOS security, tenant isolation, permissions, observability, migrations, CI/CD, or definition-of-done checks.
---

# BarberOS Quality

Use this skill for tests, reviews, security hardening, tenant isolation, observability, migrations, CI/CD and readiness checks.

## Required Context

Read `specs/architecture.md` quality, security, testing, observability and deployment sections. Read `specs/design.md` Definition of Done sections for UI work.

## Security Defaults

- Least privilege.
- Deny by default.
- Tenant isolation.
- Server-side authorization.
- Immutable audit where financial, inventory, permissions, AI or support access risk exists.
- Secret rotation readiness.
- No secrets in repository.
- No Supabase service role in browser.
- Mask sensitive data in logs.

## Required Isolation Tests

For every tenant-scoped module, include tests like:

```text
Tenant A creates resource A
Tenant B tries to access resource A
-> 403 or 404
```

Cover both reads and writes when the module has side effects.

## Critical Test Areas

- Appointment conflict prevention, including concurrent attempts.
- Check-in transaction opens order with scheduled services.
- Payment completion creates financial entries and outbox events.
- Stock movements are generated from paid orders, not transient cart edits.
- Commission accrual uses rule snapshots.
- Webhooks validate signature, timestamp and idempotency.
- Authorization and entitlements are enforced server-side.
- AI tools validate intent, selected tool, arguments, authorization, confirmation and side effects.

## E2E Flows

Prioritize:

- login -> agenda -> check-in -> comanda -> payment -> commission;
- walk-in -> new order -> service/product/beverage -> payment -> stock -> finance;
- WhatsApp or AI -> availability -> appointment.

## Observability

Propagate `request_id` across web, worker, AI, external APIs and logs.

Prefer structured logs with module, event, tenant context when safe, request id and error codes. Do not log raw secrets, payment data, tokens or sensitive message contents unless explicitly redacted.

## UI Readiness

For P0 screens verify:

- 320px, 390px, 768px, 1024px, 1440px and 1920px layouts;
- light and dark themes;
- loading, empty, error, disabled and offline states when relevant;
- touch, mouse and keyboard interaction;
- permission-aware rendering;
- basic WCAG 2.2 AA criteria.

## Migration Discipline

Use versioned migrations. For production-sensitive changes, prefer expand/migrate/contract and avoid dropping fields in the same deploy that removes application usage.
