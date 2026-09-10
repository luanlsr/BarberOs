# Tasks: Financeiro, Comissoes e Repasses

## 1. Contracts And Permission Catalog

- [x] 1.1 Add financial entry direction/type/status, expense status, commission rule type/scope/status, commission accrual status and payout status schemas in `packages/contracts`, and verify contract tests cover valid and invalid enum values.
- [x] 1.2 Add `FinancialEntry`, `ExpenseCategory`, `Expense`, `CommissionRule`, `CommissionAccrual`, `Payout` and payout allocation/source schemas with tenant/branch fields, source references, actor fields, money amounts and timestamps, and verify parsing tests reject negative money where invalid and missing scope.
- [x] 1.3 Add finance summary, expense list/detail, commission summary, payout detail and professional wallet response schemas, and verify tests cover empty period, branch-scoped totals and own-wallet visibility shapes.
- [x] 1.4 Add create/update/pay/cancel expense, create/update commission rule, generate accrual, close payout, pay payout and correction command schemas with idempotency keys where writes are critical, and verify validation tests cover recurrence, effective dates, payout periods and cash-payment requirements.
- [x] 1.5 Add stable API error codes for finance and commission failures, and verify shared API error tests cover permission, branch scope, duplicate idempotency, missing cash session and immutable-history errors.

## 2. Database And Seed Data

- [x] 2.1 Create a versioned Supabase migration for financial entries, expense categories, expenses, recurring expense templates if needed, commission rules, commission accruals, payouts and payout allocations, and verify migration validation detects tenant/branch indexes and foreign keys.
- [x] 2.2 Add RLS/policies or equivalent database checks for finance and commission tables, and verify migration validation detects tenant isolation, branch scope and professional wallet restrictions.
- [x] 2.3 Add uniqueness/idempotency constraints for payment-derived financial entries, refund reversals, commission accrual source items, expense payment keys and payout payment keys, and verify migration validation covers duplicate prevention.
- [x] 2.4 Add transactional database functions or repository transaction boundaries for payment-to-finance side effects, expense payment, payout close/pay and cash-affecting operations, and verify SQL or migration validation covers rollback-sensitive behavior.
- [x] 2.5 Extend development seed data with expense categories, sample expenses, commission rules, paid Comanda finance entries, open commission accruals and one payout scenario, and verify local data loaders can render populated and empty finance states.

## 3. Finance Domain And Application Services

- [x] 3.1 Create `finance` module boundaries with `domain`, `application`, `infrastructure` and `presentation` exports, and verify module index exports resolve in typecheck.
- [x] 3.2 Implement finance domain helpers for signed entry direction, period filtering, result totals, source uniqueness and immutable reversal entries, and verify focused unit tests cover exact cents arithmetic.
- [x] 3.3 Implement `FinanceApplicationService` read methods for financial entries, expense lists and finance summaries with authorization and branch scope checks, and verify service tests cover owner, finance, manager and forbidden actors.
- [x] 3.4 Implement expense create/update/pay/cancel workflows with server-derived financial entries and immutable paid corrections, and verify service tests cover open expense, paid expense, recurrence, cash payment and permission denial.
- [x] 3.5 Integrate cash-paid expenses with the cash register service/repository boundary, and verify service tests cover missing open session, branch mismatch and successful cash movement creation.
- [x] 3.6 Record audit events for financial entry creation, expense creation/payment/cancellation and expense correction, and verify fake audit sink tests capture actor, tenant, branch, action, result and amount.

## 4. Commission Domain And Application Services

- [x] 4.1 Create `commissions` module boundaries with `domain`, `application`, `infrastructure` and `presentation` exports, and verify module index exports resolve in typecheck.
- [x] 4.2 Implement commission rule matching helpers with deterministic precedence for item-specific, professional-specific and default rules, and verify unit tests cover overlapping rules and no-rule outcomes.
- [x] 4.3 Implement commission accrual calculation from paid Comanda items using rule snapshots, and verify unit tests cover percentage, fixed value, quantity, discounts and zero/non-commissioned items.
- [x] 4.4 Implement `CommissionApplicationService` rule management with authorization, effective dates and tenant/branch scope checks, and verify service tests cover create/update/deactivate and permission denial.
- [x] 4.5 Implement payment-completion accrual generation with source uniqueness and refund adjustment/reversal behavior, and verify service tests preserve original accruals after rule changes and refunds.
- [x] 4.6 Implement payout close/pay/correction workflows that settle accruals without destructive edits, and verify service tests cover partial periods, paid payout immutability and duplicate idempotency keys.
- [x] 4.7 Integrate cash-paid payouts with the cash register service/repository boundary, and verify service tests cover missing open session, branch mismatch and successful cash movement creation.
- [x] 4.8 Record audit events for commission rules, accrual adjustments, payout close and payout payment, and verify fake audit sink tests capture actor, tenant, branch, professional, action, result and amount.

## 5. Infrastructure And APIs

- [x] 5.1 Implement Supabase finance repository methods using tenant-scoped queries and transactional persistence for entries/expenses, and verify repository mapping tests parse returned rows and reject out-of-scope data.
- [x] 5.2 Implement Supabase commission repository methods for rules, accruals, payouts and wallet reads, and verify repository mapping tests cover tenant, branch and professional scopes.
- [x] 5.3 Extend Supabase payment repository/RPC paths so receive/refund can create finance entries and commission side effects atomically, and verify payment repository tests cover rollback and duplicate side-effect prevention.
- [x] 5.4 Add `GET /api/v1/finance/summary` and `GET /api/v1/finance/entries`, and verify route handler tests cover period filters, branch filters, permission denial and sanitized errors.
- [x] 5.5 Add `GET/POST/PATCH /api/v1/expenses` plus pay/cancel actions, and verify route handler tests cover validation errors, unauthorized actor, recurrence and duplicate idempotency responses.
- [x] 5.6 Add `GET/POST/PATCH /api/v1/commission-rules`, and verify route handler tests cover rule precedence inputs, effective date validation, permission denial and tenant leakage prevention.
- [x] 5.7 Add `GET /api/v1/commissions/accruals`, `POST /api/v1/payouts`, payout pay/correct actions and wallet read endpoints, and verify route handler tests cover owner/finance/professional visibility and stable errors.
- [x] 5.8 Ensure all finance/commission API responses use stable error envelopes with request ids and no tenant leakage, and verify shared presentation tests cover sanitized errors.

## 6. UX/UI Data Loading

- [x] 6.1 Add Financeiro data loading model with period, revenue, expenses, estimated result, commission liability, payout totals, cash-flow totals and allowed actions, and verify data tests cover populated, empty, error, offline and permission-denied states.
- [ ] 6.2 Add Despesas data loading model with categories, expense statuses, recurrence labels, paid/open totals and allowed actions, and verify data tests cover open, paid, overdue and permission-denied states.
- [ ] 6.3 Add Comissoes/Repasses data loading model with rules, open accruals, payout periods, payout status and allowed actions, and verify data tests cover no-rule, open accrual, closed payout and paid payout states.
- [ ] 6.4 Add Minha carteira data loading model for professionals with own production, open commission, paid payouts and expected balance, and verify tests deny cross-professional wallet data.
- [ ] 6.5 Update navigation models to expose Financeiro, Nova despesa, Comissoes/Repasses and Minha carteira only when permissions and entitlements allow them, and verify navigation tests cover owner, finance, manager, receptionist and professional roles.

## 7. UX/UI Screens And Components

- [ ] 7.1 Build `/financeiro` responsive summary screen with period controls, revenue/expense/result KPIs, cash-flow summary, commission liability and payout summary, and verify component tests cover mobile, tablet and desktop structural rendering.
- [ ] 7.2 Build expense list and expense form/drawer with category, dates, recurrence, payment method, attachment metadata and pay/cancel actions, and verify component tests cover loading, empty, error, disabled, offline and permission-denied states.
- [ ] 7.3 Build commission rule management and payout workspace with rule precedence display, open accruals, close payout and pay payout flows, and verify component tests cover no-rule diagnostics, paid payout immutability and cash-payment warnings.
- [ ] 7.4 Build `/minha-carteira` professional wallet screen with own production, open commissions, paid payouts and expected balance, and verify component tests cover professional-only and elevated viewer states.
- [ ] 7.5 Update Comanda payment completion feedback to indicate finance and commission updates when applicable without showing paid totals as due, and verify `OrderView` or payment panel tests cover the updated feedback.
- [ ] 7.6 Add accessible form labels, focus states and touch-sized controls for finance, expense, commission and wallet screens, and verify tests or snapshots cover key labels and disabled controls.

## 8. E2E And Validation

- [ ] 8.1 Add E2E coverage for `agenda -> check-in -> Comanda -> pagamento -> financeiro -> comissao -> payout` and verify the Playwright test passes on mobile and desktop viewports.
- [ ] 8.2 Add E2E coverage for `despesa -> pagamento em dinheiro -> caixa -> financeiro` and verify the Playwright test passes on mobile and desktop viewports.
- [ ] 8.3 Add migration validation script or extend existing validators for finance/commission schema, RLS, indexes, idempotency, source uniqueness and seed checks, and verify `npm run validate:finance` or equivalent passes.
- [ ] 8.4 Run focused unit/API/component tests for contracts, finance, commissions, payments, cash register, order data, navigation and finance/commission UI, and verify the selected `npx vitest run` command passes.
- [ ] 8.5 Run `openspec validate financial-ledger-commissions --strict` and verify the change remains valid after implementation task updates.
- [ ] 8.6 Run the full validation gate with `npm run validate` and verify format, lint, typecheck, unit tests and build all pass.
