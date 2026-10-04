# Production Readiness Checklist

## Status

- Epic: `production-hardening-observability`
- Owner: platform/product engineering
- Release stage: in progress
- Last reviewed: 2026-10-03

## Release Blockers

A production release is blocked when any item below is true:

- `npm run validate:production` fails.
- `npm run validate` fails.
- `npm run validate:client-secrets` reports a forbidden marker in client bundles or public config.
- Any migration validator fails.
- `npx openspec validate production-hardening-observability --strict` fails while this change is active.
- Tenant isolation matrix has a `Blocked` item without an owner.
- P0 UI readiness matrix has a `Blocked` item without an owner.
- A required runbook is missing for payment, WhatsApp/provider, worker, tenant isolation, database restore or platform support incidents.
- A provider-dependent manual check is required for the release and has no recorded result.

## Deterministic Gates

Run these before release candidate approval:

```bash
npm run validate:production
npm run test:e2e
npx openspec validate production-hardening-observability --strict
```

`validate:production` is the release gate. It must include:

- `npm run validate`
- `npm run validate:client-secrets`
- all current migration validators
- OpenSpec validation for active production readiness work

## Manual Provider Checks

Provider-dependent checks are not required in default CI because they need external credentials or third-party side effects. Record the result in this checklist before production release.

| Area              | Check                                                                   | Evidence                                                  | Owner                | Status  |
| ----------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- | ------- |
| Payment provider  | Checkout/webhook happy path with sandbox credentials                    | Manual release note with request id and provider event id | Platform engineering | Pending |
| WhatsApp provider | Signed webhook and outbound template send in sandbox/local provider     | Runbook checklist result                                  | Platform engineering | Pending |
| AI provider       | Tool call authorization and confirmation flow with non-production token | Test transcript or audit entry id                         | AI engineering       | Pending |
| Email/auth        | Password reset and welcome email template in staging                    | Message id or provider event id                           | Platform engineering | Pending |

## Evidence Links

- Tenant isolation matrix: [tenant-isolation-matrix.md](tenant-isolation-matrix.md)
- P0 UI readiness matrix: [ui-readiness-matrix.md](ui-readiness-matrix.md)
- Deployment readiness: [deployment-readiness.md](deployment-readiness.md)
- Release and rollback: [release-and-rollback.md](release-and-rollback.md)
- AI/tool boundary readiness: [ai-tool-boundary-readiness.md](ai-tool-boundary-readiness.md)
- Payment failure runbook: [runbooks/payment-failure.md](runbooks/payment-failure.md)
- WhatsApp/provider runbook: [runbooks/whatsapp-provider-failure.md](runbooks/whatsapp-provider-failure.md)
- Worker failure runbook: [runbooks/worker-failure.md](runbooks/worker-failure.md)
- Tenant isolation incident runbook: [runbooks/tenant-isolation-incident.md](runbooks/tenant-isolation-incident.md)
- Database restore runbook: [runbooks/database-restore.md](runbooks/database-restore.md)
- Platform support access runbook: [runbooks/platform-support-access.md](runbooks/platform-support-access.md)

## RLS, Policy and Index Review

| Area                   | Tables or policies                                             | Evidence                                                        | Owner                     | Status |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------- | ------ |
| Foundation/identity    | tenants, branches, memberships, permissions                    | `validate:foundation`; `openspec/specs/identity-access/spec.md` | Platform engineering      | Ready  |
| Scheduling             | appointments, schedules, blocks, availability                  | `validate:core-operations`; scheduling tests                    | Operations engineering    | Ready  |
| Orders/POS             | orders, order_items, check-in transaction                      | `validate:orders`; order and check-in tests                     | Operations engineering    | Ready  |
| Payments/cash          | payments, cash_registers, cash_movements                       | `validate:payments`; payment/cash tests                         | Money engineering         | Ready  |
| Finance/commissions    | financial_entries, expenses, commission accruals, payouts      | `validate:finance`; commission tests                            | Money engineering         | Ready  |
| Inventory/catalog      | products, categories, stock movements, balances                | `validate:inventory`; inventory tests                           | Operations engineering    | Ready  |
| Worker/outbox          | outbox, worker jobs, notifications                             | `validate:worker`; worker tests                                 | Platform engineering      | Ready  |
| Messaging/campaigns    | conversations, messages, provider events, campaigns            | `validate:messaging`; messaging tests                           | Communication engineering | Ready  |
| Product domain         | customer plans and product-domain extensions                   | `validate:product-domain`; product-domain validator             | Product engineering       | Ready  |
| Platform admin/billing | platform audit, plans, subscriptions, invoices, support scopes | `validate:master-admin-billing`; platform-admin tests           | Platform engineering      | Ready  |

No blocker is currently known. Any new blocker must include an owner and a target fix change before release approval.

## Critical Flow Evidence

| Flow                                                                     | Automated evidence                                                                                         | Manual/provider evidence                   | Status                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------- |
| login -> agenda -> check-in -> Comanda -> payment -> commission          | `e2e/orders-check-in.spec.ts`; unit/integration coverage                                                   | Release note if sandbox payment is used    | Ready                            |
| walk-in -> new Comanda -> service/product -> payment -> stock -> finance | `e2e/inventory-products.spec.ts`; unit/integration coverage                                                | Release note if sandbox payment is used    | Ready                            |
| WhatsApp or AI -> availability -> appointment                            | messaging/AI contracts, route/worker tests, [ai-tool-boundary-readiness.md](ai-tool-boundary-readiness.md) | WhatsApp/AI sandbox transcript or audit id | Ready with manual provider check |
