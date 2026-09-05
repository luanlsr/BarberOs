---
name: barberos-architecture
description: Use when implementing or reviewing BarberOS architecture, backend modules, database models, tenancy, permissions, APIs, workers, or domain boundaries.
---

# BarberOS Architecture

Use this skill for implementation or review of backend, database, module structure, API contracts, tenancy, permissions, jobs, events, workers, and core domain behavior.

## Required Context

Read `specs/architecture.md` before architectural work. Read `specs/prd.md` for domain semantics that are not obvious from the architecture document. For implementation sequencing beyond the current change, also read `PRODUCT_COMPLETION_ROADMAP.md`.

## Core Shape

Start with a modular monolith plus separate AI service and worker:

- `apps/web`: Next.js + TypeScript for UI, API, application/domain orchestration, webhooks, Tool Gateway and Master Admin.
- `apps/worker`: Node.js + TypeScript for outbox, jobs, messaging, reminders, campaigns and async processing.
- `apps/ai`: FastAPI + Python for Barber AI orchestration and function calling.
- `packages/domain`, `packages/db`, `packages/auth`, `packages/permissions`, `packages/contracts`, `packages/events`, `packages/integrations`, `packages/ui`, `packages/config`, `packages/testing` as shared packages when the monorepo exists.

## Module Boundaries

Route handlers are adapters. Business behavior belongs in application services and domain policies.

Preferred module structure:

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

The domain layer must not import Next.js, React, Supabase SDK, Redis, OpenAI or WhatsApp provider clients.

## Tenant And Authorization Rules

- Every operational entity is tenant-scoped with `tenant_id`; add `branch_id` when branch scope matters.
- Every authenticated operation receives a `RequestContext`.
- Repositories should require context or explicit tenant scope; avoid unscoped `findAll`.
- Validate active tenant membership server-side.
- Enforce RBAC + permissions through a central authorization service.
- Enforce feature entitlements server-side.
- Use RLS as defense in depth.
- Never expose service role credentials to the browser.

## Critical Domain Invariants

- Appointment conflicts must be prevented at the database level, not only in UI or application code.
- Check-in should update the appointment and open/populate the order in one transaction.
- Use `Order` in code for the UI concept "Comanda".
- Order items store price/name/type snapshots.
- Payments support multiple methods and lifecycle status.
- Financial, cash and stock records are auditable and preferably immutable.
- Paid transactions are corrected by reverse/adjustment movements, not destructive edits.
- Commissions use snapshots of the active rule at accrual time.
- Critical side effects use transactional outbox.
- Webhooks and critical writes use idempotency keys.

## API And Data Contracts

- Prefer Zod for TypeScript contracts and Pydantic for Python contracts.
- Return stable error codes, not only message strings.
- Propagate `request_id` across web, worker, AI service, external APIs and logs.
- Version tool contracts or keep backward compatibility during independent deploys.

## Implementation Order

Prefer foundation before high-level features:

1. Monorepo and project tooling.
2. Auth, tenant, branch, membership, permissions and audit.
3. Scheduling core.
4. POS/order/payment.
5. Finance, commission and inventory projections.
6. Outbox/worker.
7. AI and messaging.
