# Tenant Isolation Matrix

This matrix is release evidence for the production readiness gate. `Ready` means the module has tenant-scoped application logic plus tests, RLS/migration validation, or a documented platform-only boundary.

| Module                 | Read surface                                                              | Write/side-effect surface                               | Isolation evidence                                                               | RLS/migration evidence                          | Status      |
| ---------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- | ----------- |
| Identity/access        | session context, workspace, role catalog                                  | membership and permission changes                       | `apps/web/lib/session-context.test.ts`, `packages/permissions/src/index.test.ts` | `npm run validate:foundation`                   | Ready       |
| Core operations        | professionals, services, customers, schedules, availability, appointments | create/update/archive, scheduling changes               | route/service tests under `apps/web/src/modules/*`                               | `npm run validate:core-operations`              | Ready       |
| Orders/check-in        | order reads, order detail, check-in lookup                                | check-in transaction, order item writes                 | `check-in-service.test.ts`, order route/data tests                               | `npm run validate:orders`                       | Ready       |
| Payments/cash          | payment and cash summaries                                                | payment receive/refund, cash open/close/movement        | payment and cash-register service/repository tests                               | `npm run validate:payments`                     | Ready       |
| Finance/commissions    | finance summary, expenses, commissions, wallet                            | expenses, payouts, financial entries, accruals          | finance, payout and commission tests                                             | `npm run validate:finance`                      | Ready       |
| Inventory/catalog      | products, categories, balances, alerts                                    | product/category writes, stock movement writes          | catalog/inventory repository and domain tests                                    | `npm run validate:inventory`                    | Ready       |
| Worker/outbox          | worker failures/status                                                    | job claims, retries, notification dispatch              | worker runtime and failure visibility tests                                      | `npm run validate:worker`                       | Ready       |
| Messaging/campaigns    | conversations, messages, campaign metrics, operations                     | provider events, campaign lifecycle, recipient outcomes | messaging/campaign route, adapter and worker tests                               | `npm run validate:messaging`                    | Ready       |
| Product/customer plans | customer plans, CRM preferences                                           | product-domain extension writes                         | product-domain migration validator                                               | `npm run validate:product-domain`               | Ready       |
| Platform admin/billing | tenant summaries, plans, invoices, audit                                  | lifecycle, plan, entitlement, support-scope updates     | `platform-isolation.test.ts`, route/service tests                                | `npm run validate:master-admin-billing`         | Ready       |
| Barber AI/tool gateway | authorized context, tool registry, audit summaries                        | tool execution and confirmations                        | existing AI/tool-gateway planning and tests; further readiness in this epic      | AI service pytest and production readiness docs | In progress |

## Required Cross-Tenant Pattern

For every tenant-scoped module with side effects:

```text
Tenant A owns Resource A.
Tenant B attempts to read Resource A.
Expected: 403 or 404 without Resource A payload.

Tenant B attempts to mutate Resource A.
Expected: 403 or 404 and Resource A unchanged.
```

## Follow-up Rule

If a module is added after this matrix, it must define:

- tenant id and optional branch id ownership;
- server-side authorization entry point;
- repository or query tenant filter;
- RLS/policy migration evidence;
- at least one cross-tenant read/write test or an explicit platform-only exemption.
