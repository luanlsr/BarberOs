## 1. Contracts And Configuration

- [x] 1.1 Add outbox event, worker job, job status, notification intent, delivery attempt and worker error-code schemas to `packages/contracts`, and verify contract tests cover valid payloads, invalid scope, unsupported job versions and sanitized error envelopes.
- [x] 1.2 Add worker/Redis configuration fields to shared config with safe defaults for local development, and verify config tests cover missing, invalid and production-like environment values.
- [x] 1.3 Add stable permission/entitlement constants for worker failure visibility and notification status access, and verify navigation/permission tests cover owner, manager, receptionist, professional and forbidden actors.

## 2. Database, RLS And Seeds

- [x] 2.1 Create a versioned migration for outbox events, worker jobs, job attempts, notification intents and delivery attempts, and verify migration validation detects tenant/branch columns, foreign keys, status checks, timestamps and source references.
- [x] 2.2 Add RLS/policies or equivalent database guards for outbox, jobs and notification tables, and verify migration validation covers tenant isolation, branch scope and operator-only failure visibility.
- [x] 2.3 Add uniqueness/idempotency constraints for outbox source events, executable jobs and notification intents/delivery attempts, and verify validation covers duplicate prevention by tenant/source/idempotency key.
- [x] 2.4 Extend development seed data with pending, succeeded, retrying, failed and dead-lettered jobs plus notification delivery examples, and verify local loaders can render healthy, empty and failed states.
- [x] 2.5 Add `npm run validate:worker` or equivalent migration validation script for worker/outbox/notification schema and seed checks, and verify it passes.

## 3. Web Outbox And Notification Producers

- [x] 3.1 Create `outbox` and `notifications` module boundaries in `apps/web` with domain, application, infrastructure and presentation exports, and verify module index exports resolve in typecheck.
- [x] 3.2 Implement outbox domain helpers for event naming, idempotency keys, retry-safe source references, status transitions and sanitized errors, and verify unit tests cover duplicate and invalid transition cases.
- [x] 3.3 Implement notification domain helpers for intent creation, delivery lifecycle and provider-agnostic recipient references, and verify unit tests cover duplicate intents, permanent failures and cross-tenant data rejection.
- [x] 3.4 Implement Supabase repositories for outbox events, jobs, job attempts, notification intents and delivery attempts using tenant/branch-scoped queries, and verify repository mapping tests parse rows and reject out-of-scope data.
- [x] 3.5 Implement application services for creating outbox events and notification intents from committed web operations with authorization and idempotency, and verify service tests cover worker-offline success, duplicate retries and tenant isolation.

## 4. Integration With Existing Domains

- [x] 4.1 Extend payment completion and correction flows to enqueue outbox events after committed payment/order/cash/finance/commission/inventory effects, and verify payment service tests cover worker-offline success and duplicate event prevention.
- [x] 4.2 Extend Comanda open/paid lifecycle flows to enqueue follow-up or analytics jobs without blocking order success, and verify order/check-in tests cover committed order state with pending outbox events.
- [x] 4.3 Extend scheduling flows to enqueue or cancel/no-op appointment reminder jobs based on current appointment state, and verify scheduling tests cover confirmed, cancelled and retried reminder scenarios.
- [x] 4.4 Extend finance, payout and inventory-sensitive flows to enqueue recalculation or reconciliation jobs from immutable source records, and verify finance/inventory tests cover retry-safe job creation.
- [x] 4.5 Ensure all new producers propagate request/correlation ids and sanitized audit metadata, and verify shared API/presentation tests cover stable error envelopes with request ids.

## 5. Worker Runtime And Processing

- [x] 5.1 Expand `apps/worker` into a structured runtime with health/readiness endpoints, polling loop, graceful shutdown and handler registry, and verify worker unit tests cover startup, health and shutdown behavior.
- [x] 5.2 Implement durable job claiming, leases, Redis-backed locks and safe reclaim behavior, and verify worker tests cover concurrent claim attempts and expired leases.
- [x] 5.3 Implement outbox dispatch into executable jobs with idempotency and source uniqueness, and verify worker tests cover one event producing one or multiple jobs without duplicates.
- [x] 5.4 Implement retry, exponential backoff, rate-limit delay and dead-letter transitions, and verify deterministic clock tests cover retry scheduling, retry exhaustion and non-retryable failures.
- [x] 5.5 Implement initial handlers for appointment reminders, post-service follow-up, finance recalculation, stock alerts and expired cleanup using current-state reads before side effects, and verify handler tests cover stale/no-op source state.
- [x] 5.6 Add structured logging with job id, event id, tenant id, branch id, correlation id, attempt count and sanitized error details, and verify tests or log snapshots cover sensitive-data redaction.

## 6. Notification Delivery Foundation

- [ ] 6.1 Implement provider-agnostic notification intent creation and delivery attempt recording, and verify tests cover sent, retryable failure and permanent failure states.
- [ ] 6.2 Add a local/noop notification provider adapter for development and tests, and verify worker handler tests record delivery attempts without calling external services.
- [ ] 6.3 Add rate-limit and retry handling for notification delivery jobs, and verify tests cover provider unavailable and rate-limited responses.
- [ ] 6.4 Ensure notification status reads enforce tenant, branch and permission scope, and verify route/service tests cover cross-tenant and unauthorized access denial.

## 7. Operational Failure UI And APIs

- [ ] 7.1 Add read APIs for worker/outbox/job/notification failure summaries with stable error envelopes, and verify route handler tests cover filters, permissions and sanitized errors.
- [ ] 7.2 Add data loading model for operational failures with healthy, empty, failed, loading, error and permission-denied states, and verify data tests cover branch-scoped results.
- [ ] 7.3 Add a compact operational failure surface in the app shell or operations area with failed job/outbox/notification summaries and retry metadata, and verify component tests cover mobile, tablet, desktop and empty/failed states.
- [ ] 7.4 Update navigation/central actions to expose operational failure status only to authorized operators, and verify navigation tests cover allowed and forbidden roles.

## 8. E2E And Validation

- [ ] 8.1 Add focused integration/E2E coverage for `payment -> outbox event -> worker job -> succeeded notification/noop delivery` and verify it passes in the local test environment.
- [ ] 8.2 Add focused integration/E2E coverage for `appointment reminder job -> provider unavailable -> retry/dead-letter -> failure visible to operator` and verify it passes.
- [ ] 8.3 Run focused unit/API/component tests for contracts, outbox, notifications, payments, orders, scheduling, finance, worker runtime and operational failure UI, and verify the selected `npx vitest run` command passes.
- [ ] 8.4 Run `npm run validate:worker` or equivalent migration validation and verify worker/outbox/notification schema remains valid.
- [ ] 8.5 Run `openspec validate worker-outbox-notifications --strict` and verify the change remains valid after implementation task updates.
- [ ] 8.6 Run the full validation gate with `npm run validate` and verify format, lint, typecheck, unit tests and build all pass.