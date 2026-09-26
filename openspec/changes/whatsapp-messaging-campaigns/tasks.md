# Tasks

## 1. Contracts, config and permissions

- [x] 1.1 Add messaging connection, provider, conversation, message, raw provider event, consent, opt-out, campaign, campaign run and recipient outcome schemas in `packages/contracts`.
- [x] 1.2 Add WhatsApp delivery, webhook event, provider status and campaign dispatch payload contracts with idempotency keys and tenant/branch scope.
- [x] 1.3 Extend permissions and entitlements for `messaging.read`, `messaging.manage`, `campaigns.read`, `campaigns.create`, `campaigns.approve`, `campaigns.send` and delivery health access.
- [x] 1.4 Add server-only provider configuration and webhook secret validation settings in `packages/config` without exposing secrets to client bundles.
- [x] 1.5 Add contract tests for schema parsing, invalid payload rejection, permission constants and provider event normalization shapes.

## 2. Database, migrations and tenant isolation

- [x] 2.1 Create migrations for messaging connections, raw provider events, conversations, messages, message delivery/provider status events and consent audit records.
- [x] 2.2 Create migrations for campaigns, campaign runs, audience snapshots, recipient outcomes and campaign metric rollups where needed.
- [x] 2.3 Add unique constraints for provider event ids, provider message ids, campaign recipient idempotency and webhook replay prevention.
- [x] 2.4 Add tenant and branch indexes for conversation lists, campaign lists, due campaign runs, delivery health and webhook processing queries.
- [x] 2.5 Add RLS policies for messaging, consent, delivery and campaign tables using tenant and branch scope as defense in depth.
- [x] 2.6 Add seed/demo data for safe local messaging connections, sample conversations and campaign drafts without real provider secrets.
- [x] 2.7 Add migration/RLS tests proving cross-tenant and cross-branch reads/writes are denied.

## 3. Messaging domain and application services

- [x] 3.1 Create `messaging` module boundaries in `apps/web` with domain, application, infrastructure and presentation exports.
- [x] 3.2 Implement messaging connection management services with permission checks, branch fallback rules, status transitions and audit metadata.
- [x] 3.3 Implement consent and opt-out services with transactional versus marketing eligibility decisions and auditable source metadata.
- [x] 3.4 Implement conversation and message persistence services for inbound and outbound messages, unresolved senders and customer linking.
- [x] 3.5 Implement raw provider event repository and idempotent processing markers for inbound messages and delivery status events.
- [x] 3.6 Add unit tests for connection selection, consent gates, opt-out keywords, unresolved conversations and tenant/branch authorization.

## 4. Provider adapters and webhooks

- [x] 4.1 Define a provider adapter interface for outbound send, webhook verification, inbound normalization and status normalization.
- [x] 4.2 Implement a local/noop adapter for development that records attempts without pretending WhatsApp delivery occurred.
- [x] 4.3 Implement the first WhatsApp provider adapter boundary with request/response mapping, sanitized errors and rate-limit signals.
- [x] 4.4 Add webhook route handlers that validate signature/timestamp/connection, persist raw events idempotently and enqueue worker processing.
- [x] 4.5 Add webhook tests for valid events, invalid signatures, stale timestamps, unknown connections and duplicate event ids.
- [x] 4.6 Add provider adapter tests for accepted sends, retryable failures, permanent failures and status normalization.

## 5. Worker and notification integration

- [x] 5.1 Add worker handlers for outbound WhatsApp delivery attempts, using provider adapters and existing retry/dead-letter behavior.
- [x] 5.2 Add worker handlers for raw inbound webhook processing into conversations, messages, opt-out changes and delivery status events.
- [ ] 5.3 Extend notification delivery routing to select WhatsApp when the intent, connection and consent state allow it.
- [ ] 5.4 Extend appointment reminder and follow-up jobs to create WhatsApp-capable transactional intents while keeping local/noop development behavior explicit.
- [ ] 5.5 Add delivery state transitions for queued, sent, delivered, failed, skipped, blocked-by-consent and retry-exhausted outcomes.
- [ ] 5.6 Add worker tests for idempotent delivery, provider retry, provider permanent failure, stale appointment cancellation and consent recheck at send time.

## 6. Scheduling integration

- [ ] 6.1 Emit confirmation notification intents when appointments are created or confirmed for eligible customers.
- [ ] 6.2 Emit reminder notification intents using tenant/branch reminder settings and appointment timezone context.
- [ ] 6.3 Cancel or no-op pending reminder intents when appointments are cancelled, rescheduled or no longer eligible.
- [ ] 6.4 Emit post-service follow-up intents when appointments reach completed status and follow-up is configured.
- [ ] 6.5 Add scheduling integration tests proving messaging failures do not roll back appointment creation, confirmation, cancellation or completion.

## 7. Campaign domain and dispatch

- [ ] 7.1 Create `campaigns` module boundaries in `apps/web` with domain, application, infrastructure and presentation exports.
- [ ] 7.2 Implement campaign draft, review, approval, scheduling, sending, sent, partially failed and cancelled lifecycle rules.
- [ ] 7.3 Implement audience criteria, preview counts and exclusion reasons with customer/branch scope and consent filtering.
- [ ] 7.4 Implement frozen campaign run audience snapshots and per-recipient idempotency records.
- [ ] 7.5 Add worker campaign dispatch handler that creates delivery work within provider rate limits and records per-recipient outcomes.
- [ ] 7.6 Implement metrics aggregation for sent, delivered, failed, skipped, blocked-by-consent, opt-outs and replies.
- [ ] 7.7 Add unit and integration tests for lifecycle permissions, approval, audience filtering, dispatch idempotency, partial failures and metric updates.

## 8. APIs and UI surfaces

- [ ] 8.1 Add server APIs for messaging connections, delivery health, conversations, campaign drafts, previews, approvals, scheduling, cancellation and metrics.
- [ ] 8.2 Add permission-aware shell entries and route guards for messaging, delivery status and campaigns without crowding mobile core operations.
- [ ] 8.3 Build messaging setup/status screens with loading, empty, error, permission denied, offline and inactive-provider states.
- [ ] 8.4 Build campaign list, editor, audience preview, approval, schedule/send confirmation and result screens for mobile, tablet and desktop.
- [ ] 8.5 Build conversation/message status surfaces with sanitized content and branch-scoped visibility.
- [ ] 8.6 Add component and route tests for permission denied, offline send prevention, partial failure presentation and responsive navigation.

## 9. Observability, audit and operations

- [ ] 9.1 Add audit events for connection changes, consent changes, campaign approval/send/cancel and provider credential reference changes.
- [ ] 9.2 Add structured logs and metrics for webhook acceptance/rejection, provider send latency, retries, dead letters and campaign throughput.
- [ ] 9.3 Add operational status queries for failed deliveries, blocked sends, delayed webhooks and campaign partial failures.
- [ ] 9.4 Document environment variables, provider setup, local/noop development behavior and webhook testing workflow.

## 10. Validation

- [ ] 10.1 Run focused tests for contracts, messaging, campaigns, scheduling notification integration, webhooks, worker handlers and UI routes/components.
- [ ] 10.2 Run `npx openspec validate whatsapp-messaging-campaigns --strict` and fix any spec/task/design issues.
- [ ] 10.3 Run the repo validation command required by the change scope and confirm lint, typecheck, tests and build pass.
- [ ] 10.4 Update `PRODUCT_COMPLETION_ROADMAP.md` with the new change status, completed task count and next planned epic after implementation.