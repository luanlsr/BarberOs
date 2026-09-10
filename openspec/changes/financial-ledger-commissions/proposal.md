## Why

Pagamentos e caixa ja fecham o ciclo operacional da Comanda, mas o produto ainda nao transforma transacoes pagas em resultado gerencial, despesas, comissoes e repasses. Este change fecha o Loop 2 do MVP: receita -> comissao -> despesas -> resultado, preservando historico auditavel e snapshots financeiros.

## What Changes

- Add financial ledger contracts, persistence, APIs and UI models for revenue, expenses, refunds, commission liabilities and payout movements.
- Add manual and recurring expenses with categories, competence/cash dates, status, payment method, optional attachment metadata and immutable correction behavior.
- Add commission rules, commission accruals and payout lifecycle using snapshots from the rule active when a paid Comanda generates production.
- Generate financial entries and commission accruals from paid Comandas/payments without rewriting paid payment records.
- Add finance summary/read models for revenue, expenses, estimated result, open commissions and paid payouts by period and branch scope.
- Add professional wallet read models so authorized professionals can see own production, commission, payouts and expected balance without tenant-wide financial data.
- Update Comanda/payment completion effects to feed finance/commission source data and expose completion feedback that finance and commission were updated when applicable.
- Update cash register behavior so cash-paid expenses and payout cash movements can be reflected without corrupting immutable cash session history.
- Update shell/navigation to expose Financeiro, Despesas, Comissoes/Repasses and Minha carteira only by permission and entitlement.
- No external accounting, NFS-e, bank reconciliation, payroll tax handling or acquirer integration in this change.

## Capabilities

### New Capabilities

- `finance`: Financial entries, expenses, categories, summaries and period/branch-scoped finance APIs/UI for operational management.
- `commissions`: Commission rules, accrual snapshots, payout lifecycle and professional wallet visibility.

### Modified Capabilities

- `payments`: Paid/refunded payment operations feed immutable financial entries and commission accrual source events without duplicating side effects.
- `orders`: Order items expose enough professional/source attribution for reproducible commission accrual after payment completion.
- `cash-register`: Cash-affecting expenses and payouts create auditable cash movements tied to the open branch cash session when applicable.
- `application-shell`: Finance, expenses, commissions, payouts and professional wallet entry points are permission-aware and entitlement-aware.

## Impact

- Affected code: `packages/contracts`, new `apps/web/src/modules/finance`, new `apps/web/src/modules/commissions`, existing `apps/web/src/modules/orders`, `apps/web/src/modules/payments`, `apps/web/src/modules/cash-register`, `apps/web/app/api/v1/finance`, `apps/web/app/api/v1/expenses`, `apps/web/app/api/v1/commissions`, `apps/web/app/api/v1/payouts`, and new finance/wallet UI surfaces.
- Affected database: versioned Supabase migration for financial entries, expense categories, expenses, recurring expense templates if needed, commission rules, commission accruals, payouts and payout allocations, with tenant/branch indexes, idempotency and RLS/policies.
- Affected UI: Financeiro dashboard, Despesas CRUD/lightweight workflow, commission rule management, payout closing/payment flow, professional wallet and shell navigation/actions.
- Affected quality gates: contract tests, tenant/branch isolation tests, application service tests for immutable ledger/commission snapshots, API tests for authorization/idempotency, migration validation, E2E paid Comanda -> finance -> commission -> payout, and full `npm run validate`.
