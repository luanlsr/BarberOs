## Context

See `proposal.md` for motivation. The current codebase now has contracts and modules for orders, payments and cash register inside the modular monolith. Payments are validated by `PaymentApplicationService`, persisted through tenant/branch-scoped repositories, and already own the critical receive/refund workflow. Orders already carry item snapshots and optional `professionalId`, which gives this change a natural source for production and commission attribution.

The PRD and architecture require finance to be simple visually but robust in the domain: paid values must be auditable, financial/cash movements must not be destructively overwritten, and commission must be reproducible through historical snapshots. Finance and commission operations are sensitive and must keep server-side authorization, tenant isolation, branch scope and audit as hard boundaries.

## Goals / Non-Goals

**Goals:**

- Add `finance` and `commissions` modules following the existing domain/application/infrastructure/presentation shape.
- Generate immutable financial entries from paid payments, refunds, expenses, commission liabilities and payouts.
- Generate commission accruals from paid Comanda items using rule snapshots, not live rule lookup at payout time.
- Provide operational finance summaries and professional wallet read models without exposing global tenant finance to unauthorized roles.
- Keep cash-affecting finance and payout operations aligned with open cash register sessions.
- Preserve idempotency and audit for critical financial writes.

**Non-Goals:**

- Accounting-grade chart of accounts, fiscal receipt issuance, NFS-e, bank reconciliation or acquirer settlement.
- Payroll/legal tax calculations for Brazilian labor or salon-partner regimes.
- Inventory product costing, stock movement generation and supplier purchase workflows; those remain for the next roadmap change.
- Worker/outbox delivery infrastructure beyond clear source/event boundaries; if an outbox exists later, it can consume these sources.

## Decisions

### Immutable financial entries as the finance source of truth

Create `FinancialEntry` as an append-only management ledger with tenant, branch, direction, type, amount, competence date, cash date, source type/id, actor and timestamps. Revenue, refunds, expenses, commission liability and payouts become entries; corrections use reversal or adjustment entries.

Rationale: the owner needs simple summaries, but the system needs traceability when money changes. An append-only ledger lets summaries be recomputed and audited.

Alternative considered: keep finance totals on payments, expenses and payouts only. That is faster initially, but it spreads reporting logic across modules and makes corrections harder to reason about.

### Finance service consumes domain results, not browser totals

Payment, refund, expense and payout application services should pass validated domain results into finance services or repository transaction boundaries. Client-provided totals remain ignored or validated as command inputs only; financial entry amounts come from persisted source records.

Rationale: money totals must be server-derived and branch-scoped. This follows the existing order/payment rule that the browser is never trusted for tenant or totals.

Alternative considered: let finance APIs accept manual revenue entries for paid Comandas. That would create duplicate revenue and break the operational source chain.

### Commission accrual at payment completion

When a Comanda becomes paid, create accruals for eligible items using the responsible professional, item final amount and the matching commission rule active at that time. Store the rule snapshot fields directly on the accrual: rule id, calculation type, rate/fixed amount, base amount and computed amount.

Rationale: commissions must remain reproducible when rules change later. Payout should settle already-calculated liabilities rather than recompute historical production.

Alternative considered: compute commission only when paying professionals. That simplifies payment completion but makes historical payouts drift when rules change.

### Rule matching starts conservative

Support default professional rules, service-specific rules and product/manual item rules where source data exists. Prefer the most specific active rule and fall back to default professional or tenant rule. If no rule matches, no accrual is created and the item remains visible in finance/commission diagnostics as non-commissioned.

Rationale: this is enough for MVP barbershops without forcing a full payroll engine. It also avoids inventing commission where the tenant has not configured a rule.

Alternative considered: require every item to have a commission rule before payment. That protects completeness but blocks real reception workflows and is too strict for MVP.

### Payouts settle accruals through lifecycle states

Create payout records that group eligible accruals by professional, period and branch scope. A payout can be closed/approved and then paid. Paying creates a finance entry and, if physical cash is used, a cash movement in the open cash session. Paid payouts are corrected by adjustment/reversal, not destructive edits.

Rationale: owners need repasses paid and open amounts; professionals need their expected balance. Grouping accruals gives both views a stable reconciliation point.

Alternative considered: mark accruals paid individually. That works for tiny shops but makes period closing, payout receipts and partial corrections messy.

### Expenses are operational, not accounting-first

Create manual expense categories and expenses with status, due date, competence date, optional recurrence, payment method and optional attachment metadata. Paying an expense creates an expense financial entry; paying with cash also creates a cash movement if the branch has an open session.

Rationale: the PRD asks for simple visual finance with robust internals. Expense status and recurrence cover the owner workflow without introducing a full accounts-payable system.

Alternative considered: implement only paid expenses. That would miss upcoming bills and reduce cash-flow usefulness.

### UI favors summaries and workflows over ledger tables

Build Financeiro as a management surface: period selector, revenue/expense/result KPIs, cash-flow trend, expense list, commission liability and payout status. Expense creation and payout payment should be focused forms/drawers. Professional wallet shows own production, open commission, paid payouts and expected balance.

Rationale: finance is valuable only if owners can answer questions quickly. Detailed ledger records remain available as drill-downs or diagnostics, not the first thing shown.

Alternative considered: expose a raw ledger table first. It is easier to implement, but feels like old ERP and contradicts the design spec.

## Risks / Trade-offs

- Duplicate side effects from payment retries -> enforce idempotency at payment receive/refund plus source uniqueness for financial entries and commission accruals.
- Commission rule ambiguity -> implement deterministic precedence and tests for overlapping rules.
- Cash expense/payout without open cash session -> reject cash-affecting operations with stable errors and no partial finance state.
- Branch-scoped finance leakage -> repository filters, application visibility checks and RLS/policies must all enforce tenant and branch scope.
- Finance UI becoming too dense -> default to summary-first layouts and put detailed lists behind tabs or drill-down surfaces.
- Later inventory needs cost/margin details -> keep financial entry source metadata extensible without implementing stock/cost behavior in this change.

## Migration Plan

1. Expand contracts with finance entry, expense, commission rule, commission accrual, payout and command schemas.
2. Add a versioned migration for finance and commission tables, tenant/branch indexes, source uniqueness, RLS/policies and idempotency constraints.
3. Add `finance` and `commissions` modules with domain helpers, application services, repositories and presentation handlers.
4. Extend payment receive/refund persistence to create finance and commission side effects atomically where the source operation succeeds.
5. Add expense and payout APIs plus finance/wallet read APIs.
6. Add Financeiro, Despesas, Comissoes/Repasses and Minha carteira data loaders and responsive UI surfaces.
7. Extend development seeds and E2E coverage for paid Comanda -> finance -> commission -> payout.

Rollback strategy: use expand-style migrations. Rolling back application code should leave new finance/commission tables unused but intact. Do not drop financial or commission history in the same deployment that removes application usage.

## Open Questions

- Exact legal/accounting labels for Brazilian salon-partner payout regimes can be refined later with professional advice; this change stores operational payout data and avoids presenting it as legal payroll automation.
