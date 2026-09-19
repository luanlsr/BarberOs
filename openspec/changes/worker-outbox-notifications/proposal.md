## Why

Critical business operations already create payments, orders, finance entries, commissions and stock effects synchronously, but the product still lacks a reliable async layer for side effects that should survive worker downtime and external-provider failures. BarberOS now needs transactional outbox, a persistent worker and observable jobs before WhatsApp, campaigns, reminders, recalculations and AI scheduled work can be built safely.

## What Changes

- Add a persistent `apps/worker` runtime for outbox processing, queued jobs, retries, dead-letter handling and structured observability.
- Add transactional outbox records so critical web transactions can commit domain state and enqueue side effects atomically.
- Add internal job/event contracts for appointment reminders, post-service follow-up, finance recalculation, stock alerts, expired record cleanup and future provider dispatch.
- Add Redis-backed queue, lock, retry, backoff and rate-limit abstractions suitable for local development and deploy to Railway.
- Add notification primitives for tenant/branch-scoped operational messages without coupling this change to a real WhatsApp provider.
- Add operational visibility for failed jobs/outbox events in the app shell or a protected operations surface.
- Preserve existing payment/order/finance/inventory success behavior when the worker is offline; side effects remain retryable and auditable.

## Capabilities

### New Capabilities

- `worker-outbox`: Transactional outbox, worker runtime, job lifecycle, Redis-backed processing, retries, dead-letter handling and worker observability.
- `notifications`: Tenant/branch-scoped notification intents and delivery attempts for reminders, follow-ups and provider-agnostic operational messages.

### Modified Capabilities

- `payments`: Payment completion and correction shall enqueue required async side effects through the outbox without making external dispatch part of the synchronous success path.
- `orders`: Comanda lifecycle events shall be eligible to enqueue follow-up and notification jobs after committed state changes.
- `scheduling`: Appointment creation, confirmation, cancellation and upcoming appointments shall be eligible to enqueue reminder jobs idempotently.
- `finance`: Finance, payout and inventory-sensitive recalculation jobs shall run asynchronously and remain auditable/retryable.
- `application-shell`: Authorized operators shall have a protected way to see failed jobs or notification failures without exposing tenant data across scopes.

## Impact

- Affected apps: `apps/web` for outbox-producing services, APIs and operational failure UI; `apps/worker` for the persistent worker process.
- Affected packages: `packages/contracts` for event/job schemas; shared config/testing utilities if Redis and worker helpers are introduced.
- Affected database: versioned Supabase migrations for outbox events, jobs, notification intents/deliveries, retry metadata, locks or worker leases where persisted.
- Affected infrastructure: Redis dependency for queues, locks, rate limits and retry scheduling; Railway deployment target for the worker.
- Affected quality gates: migration validation, unit/application tests for idempotency and tenant isolation, worker integration tests for retries/dead-letter behavior, and E2E or component coverage for operational failure visibility.