## Context

See `proposal.md` for motivation. The repository already has a minimal `apps/worker` package with a health server, while `apps/web` contains the synchronous domain/application services that currently commit payments, orders, finance, commissions and inventory effects. The architecture requires critical side effects to go through transactional outbox and a persistent Railway worker, with Redis used for queue/cache/rate-limit/locks.

## Goals / Non-Goals

**Goals:**

- Persist outbox events and durable job records with tenant/branch scope, source references, idempotency keys, retry metadata and correlation ids.
- Extend existing domain/application services so committed operations can enqueue async side effects without waiting for external providers.
- Evolve `apps/worker` from health-only scaffold into a persistent process with polling/claiming, Redis primitives, handlers, retries, dead-letter behavior and structured logs.
- Add provider-agnostic notification intents and delivery attempts that future WhatsApp integration can consume.
- Add a small permission-aware operational failure surface for failed jobs/outbox/notification delivery attempts.
- Validate tenant isolation, idempotency, retry/dead-letter behavior, migration shape and worker health.

**Non-Goals:**

- Do not integrate the real WhatsApp provider in this change.
- Do not implement campaign authoring UI beyond provider-agnostic notification/job primitives.
- Do not make Redis the source of truth for durable job state.
- Do not move current payment/order/finance/inventory core transactions out of `apps/web`.
- Do not implement AI scheduled insights beyond reserving job contract shape and handler boundaries.

## Decisions

### Durable state in PostgreSQL, coordination in Redis

Use PostgreSQL/Supabase tables for outbox events, jobs, notification intents and delivery attempts. Use Redis for queue wakeups, locks, rate limits and retry scheduling acceleration.

Rationale: the database is already the transaction boundary for critical business operations, so outbox records must commit with source state. Redis is excellent for coordination but should not be the only durable record of a job or message.

Alternatives considered:

- Redis-only queues: simpler worker implementation, but losing Redis data could lose business side effects.
- Database polling only: durable and simple, but less flexible for locks, rate limiting and future provider throughput controls.

### Outbox as producer contract, jobs as execution contract

Outbox events represent committed domain facts or side-effect intents produced by `apps/web`. Jobs represent executable work claimed by `apps/worker`. A dispatcher can turn pending outbox events into one or more jobs, and idempotency keys prevent duplicates.

Rationale: some events fan out later into multiple job types, and not every job originates from a domain transaction; schedulers may create reminder jobs directly.

Alternatives considered:

- Single `outbox_events` table only: simpler, but scheduled reminders, retries and dead-letter review become harder to model cleanly.
- Single `jobs` table only: workable, but loses the distinction between a committed business event and an executable worker task.

### Minimal payloads and fresh reads

Job payloads should carry stable identifiers, tenant/branch scope, source type/id, job type and version. Worker handlers fetch current state before side effects.

Rationale: avoids stale or excessive sensitive data in queues and supports cancellation/no-op behavior when appointments, orders or notifications changed after scheduling.

### Explicit job state machine

Use statuses such as `PENDING`, `CLAIMED`, `RUNNING`, `SUCCEEDED`, `RETRY_SCHEDULED`, `FAILED`, `DEAD_LETTERED`, `CANCELLED` with attempt count, next run time, last error code and lock/lease metadata.

Rationale: operators need clear failure visibility, tests need deterministic lifecycle assertions, and multiple worker instances need safe claiming.

### Provider-agnostic notifications first

Create notification intents and delivery attempts without binding to WhatsApp Cloud or another provider. The initial provider adapter may be a noop/local adapter that records delivery attempts.

Rationale: this change creates the reliable substrate. WhatsApp/campaign behavior can build on it in the next epic without reworking persistence and retry semantics.

### Operational UI stays compact

Expose an operations/failure view through existing role-aware navigation only for authorized operators. The first screen should show failed jobs/outbox/notification attempts with filters and sanitized detail, not a full job management console.

Rationale: enough visibility for MVP support and validation without building a broad admin product before Master Admin.

## Risks / Trade-offs

- [Risk] Worker side effects could duplicate messages if idempotency is incomplete → Use unique idempotency constraints per tenant/source/job and tests for duplicate retries.
- [Risk] Long-running jobs may hold stale locks → Use leases with expiry, heartbeat metadata and safe reclaim rules.
- [Risk] Queue and database state may drift → Treat PostgreSQL as source of truth; Redis wakeups can be rebuilt from pending durable jobs.
- [Risk] Failed jobs may expose sensitive payloads → Store sanitized error summaries and keep raw provider responses out of UI/logs unless redacted.
- [Risk] Adding worker tables touches many future areas → Keep contracts versioned and focused on initial job types; avoid provider-specific fields in generic tables.
- [Risk] Tests with timers/retries can become flaky → Use deterministic clock/test adapters in worker application tests.

## Migration Plan

1. Add contracts for outbox events, jobs, notification intents, delivery attempts and stable worker error codes.
2. Add versioned migration for outbox/job/notification tables, indexes, uniqueness constraints, RLS/policies and seed scenarios.
3. Add repositories and application services in `apps/web` for producing outbox events and reading operational failure summaries.
4. Extend existing payment/order/scheduling/finance/inventory workflows to enqueue outbox events/jobs in transaction-safe boundaries.
5. Expand `apps/worker` with worker runtime modules, handler registry, Redis adapter, polling loop, lock handling, retry/dead-letter behavior and health/readiness endpoints.
6. Add provider-agnostic notification handlers with noop/local delivery adapter.
7. Add compact operational failure UI and navigation gating.
8. Add focused tests, migration validation, E2E smoke coverage and full validation gate.

Rollback strategy: the web application must continue core operations if the worker is stopped. If worker deployment fails, pause worker processing while keeping outbox/job records pending; revert handler registration or disable queue wakeups without dropping durable tables.

## Open Questions

- Exact Redis provider and production URL shape can remain an environment/config decision as long as the adapter uses generic Redis semantics.
- The real WhatsApp provider choice is intentionally deferred to the WhatsApp/campaigns epic.