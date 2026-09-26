## Context

BarberOS already has the core operational path for agenda, check-in, Comanda, payments, cash, finance, inventory and the worker/outbox notification foundation. WhatsApp is the next critical channel because Brazilian barbershops already operate much of their booking, reminder and reactivation flow through WhatsApp, but doing that manually keeps customer communication outside tenant permissions, audit, consent and operational metrics.

This change turns WhatsApp into a first-class messaging channel without making the appointment, payment or order workflows depend on an external provider being online. It also creates the campaign foundation for simple customer reactivation and marketing sends while preserving the later Barber AI automation boundary.

## Goals

- Add tenant/branch-scoped messaging connections for a WhatsApp-first provider model.
- Persist conversations, messages, provider events, consent and opt-out decisions with tenant isolation.
- Ingest provider webhooks securely and process them asynchronously through the worker.
- Route transactional appointment notifications to WhatsApp when eligible.
- Add campaign authoring, approval, audience preview, scheduling, dispatch, per-recipient outcomes and metrics.
- Preserve compatibility with future Barber AI conversation automation without implementing autonomous AI behavior in this change.

## Non-Goals

- Do not implement Barber AI intent handling, tool calling or autonomous appointment creation from inbound messages.
- Do not add multi-provider marketplace behavior beyond a provider adapter boundary and one WhatsApp-capable adapter contract.
- Do not build billing/usage metering for WhatsApp sends beyond recording delivery outcomes and provider metadata needed later.
- Do not make WhatsApp a hard dependency for agenda, order, payment or financial commits.
- Do not store provider secrets, raw tokens or customer-sensitive message payloads in client-visible responses.

## Decisions

### Provider boundary

Create a messaging provider interface for outbound send, webhook verification, inbound event normalization and delivery status normalization. The first concrete provider may be Meta WhatsApp Cloud or a local/noop adapter for development, selected by server-side configuration and messaging connection metadata.

Rationale: this preserves the architecture rule that external services stay behind infrastructure adapters and keeps provider-specific webhook/event shapes out of domain services.

### Tenant and branch scoped connections

Store messaging connections with tenant id, optional branch id, provider, status, display phone metadata, webhook verification metadata and encrypted/server-only credential references. Delivery selection prefers branch connection and can fall back to tenant-level connection only when allowed by configuration.

Rationale: barbershops may operate one WhatsApp number per branch or centralize communication, and the product must support both without leaking credentials.

### Webhook raw-event first

Webhook handlers validate signature, timestamp and configured connection, persist a raw provider event idempotently, then enqueue worker processing. Conversation/message creation and delivery status updates happen outside the request path.

Rationale: webhooks must be fast, retry-safe and auditable. Raw event persistence gives support teams a trail when provider payloads are delayed, duplicated or malformed.

### Consent as delivery gate

Model WhatsApp contact eligibility separately from marketing consent. Transactional appointment messages use transactional eligibility rules, while campaign/marketing messages require explicit marketing eligibility and must respect opt-out records. The worker rechecks eligibility at send time.

Rationale: opt-out and consent can change after preview or intent creation. Rechecking at the last responsible moment prevents stale sends.

### Campaign dispatch snapshot

Campaigns store draft content, approval metadata, audience criteria, preview counts and a frozen run/audience snapshot. Dispatch creates idempotent per-recipient work and records sent, failed, skipped and blocked-by-consent outcomes.

Rationale: operators need understandable campaign metrics, but the system must avoid silently changing the historical audience definition after approval.

### Appointment messaging integration

Scheduling emits notification intents for confirmation, reminders, cancellation and post-service follow-up. Messaging failure or provider downtime records delivery outcomes but never rolls back appointment lifecycle changes.

Rationale: WhatsApp improves operations, but agenda correctness remains the source of truth.

### UI boundaries

Expose messaging setup, delivery health and campaigns through permission-aware shell entries and feature screens. Mobile navigation must preserve Agenda, Check-in, Comanda and Pagamento as primary flows; campaign/send confirmations require online state and server authorization.

Rationale: communication is important, but the highest-frequency operational path must stay easy on phones.

## Risks / Trade-offs

- WhatsApp provider templates and rules can change; keeping provider-specific validation in the adapter reduces spread but may still require operational updates.
- Consent mistakes are high trust-risk; implementation should prefer blocking sends when eligibility is ambiguous.
- Campaign dispatch can amplify failures; rate limits, idempotency and partial failure metrics are required before real sends.
- Message content may contain sensitive data; UI and APIs should expose sanitized previews by default and protect full message content with explicit permissions.
- Active `worker-outbox-notifications` specs are not archived into the main OpenSpec tree yet, so this change declares `notifications` as a new capability while conceptually building on the completed worker/outbox foundation.

## Migration Plan

1. Add contracts for messaging providers, conversations, messages, consent, campaigns, campaign runs and delivery outcomes.
2. Add database migrations for messaging connections, raw provider events, conversations, messages, consent audit records, campaign drafts, audience snapshots, campaign runs and campaign recipient outcomes.
3. Add RLS policies and application-level authorization for tenant/branch isolation.
4. Add messaging module services and repositories in `apps/web` using existing module boundaries.
5. Add webhook route handlers as thin adapters that validate, persist raw events and enqueue worker jobs.
6. Add worker handlers for outbound WhatsApp delivery, inbound webhook processing, delivery status updates and campaign dispatch.
7. Extend scheduling notification creation to emit transactional WhatsApp-capable intents.
8. Add permission-aware UI for messaging setup/status and campaign lifecycle.
9. Add focused unit, integration, route, worker and component tests before running full validation.

## Open Questions

- Should the first production provider be Meta WhatsApp Cloud directly, or a Brazilian BSP abstraction used by local barbershops?
- Which appointment message templates are P0 for launch: confirmation, reminder, cancellation and post-service follow-up, or a smaller first set?
- Should marketing campaign approval be owner-only in MVP, or configurable for managers with `campaigns.approve`?
- What is the initial provider rate limit and daily campaign send cap per tenant/branch?
- Should full message content be visible to managers by default, or only sanitized snippets unless an explicit conversation permission is granted?