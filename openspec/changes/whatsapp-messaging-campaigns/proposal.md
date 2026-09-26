## Why

BarberOS now has the durable worker, outbox, job retry and provider-agnostic notification foundation needed to turn WhatsApp from a future channel into an operational product capability. The next product step is to support consent-aware transactional messaging, inbound WhatsApp webhooks and basic campaign workflows so appointments, CRM reactivation and customer communication can move through the same auditable platform instead of staying in ad hoc manual WhatsApp processes.

## What Changes

- Add messaging connections, provider abstraction, webhook ingestion, conversation/message persistence and delivery/event lifecycle for WhatsApp-first communication.
- Add consent and opt-out enforcement for customer-facing messages, separating transactional messages from marketing/campaign messages.
- Extend notification delivery so existing appointment reminder and follow-up intents can route through WhatsApp when a tenant/branch has an active messaging connection and consent permits it.
- Add campaign primitives for draft, audience, approval, scheduling, dispatch, partial failure and metrics using the worker/outbox layer.
- Add inbound webhook handling with signature/timestamp validation, idempotent raw event persistence and asynchronous processing through the worker.
- Add protected UI/data models for messaging status, campaign preview/dispatch and operational delivery outcomes without exposing cross-tenant message data.
- Do not integrate Barber AI conversation automation in this change beyond preserving compatible conversation/message records and webhook routing boundaries for the later AI epic.

## Capabilities

### New Capabilities

- `messaging`: WhatsApp-first provider connections, inbound/outbound message records, conversations, provider events, consent-aware delivery routing and webhook ingestion.
- `campaigns`: Campaign drafts, audiences, approval, scheduling, async dispatch, status tracking, metrics and opt-out-safe marketing sends.
- `notifications`: Notification intents and delivery attempts shall support WhatsApp provider routing, provider message ids/status events and consent-aware delivery decisions, building on the worker/outbox notification foundation.

### Modified Capabilities

- `scheduling`: Appointment lifecycle events shall produce transactional WhatsApp notifications for confirmations, reminders, cancellations and post-service follow-up when messaging is configured.
- `application-shell`: Authorized operators shall have role-aware navigation and responsive surfaces for messaging/campaign operations and delivery health.

## Impact

- Affected apps: `apps/web` for contracts, migrations, messaging/campaign modules, webhook routes, APIs and UI; `apps/worker` for WhatsApp delivery, inbound webhook processing and campaign dispatch handlers.
- Affected packages: `packages/contracts` for messaging, provider event, consent, campaign and dispatch schemas; `packages/config` for provider configuration and webhook secret validation.
- Affected database: versioned Supabase migrations for messaging connections, conversations, messages, provider events, campaign drafts/runs/audiences and consent/opt-out audit records where needed.
- Affected infrastructure: external WhatsApp/BSP adapter boundary, webhook endpoint security, worker queue throughput/rate-limit settings and provider credentials stored only server-side.
- Affected quality gates: tenant isolation tests, webhook idempotency/signature tests, consent/opt-out tests, worker retry/dead-letter tests, campaign dispatch tests, route/component tests and migration validation.