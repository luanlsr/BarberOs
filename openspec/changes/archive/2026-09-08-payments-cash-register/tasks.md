# Tasks: Pagamentos e Caixa

## 1. Contracts And Permissions

- [x] 1.1 Add payment method, payment status, refund status, cash session status and cash movement type schemas in `packages/contracts` and verify contract tests cover valid/invalid enum values.
- [x] 1.2 Add `Payment`, `PaymentAllocation`, `CashRegisterSession` and `CashMovement` schemas with tenant/branch fields, actor fields, amounts and timestamps, and verify parsing tests reject negative money and missing scope.
- [x] 1.3 Add receive-payment, refund-payment, open-cash, cash-movement and close-cash command schemas with idempotency keys and reason requirements, and verify validation tests cover split payment, cash change and divergence notes.
- [x] 1.4 Extend order status contracts with paid lifecycle support and verify transition tests reject direct paid closure outside the payment workflow.
- [x] 1.5 Add stable API error codes for payment and cash failures and verify shared API error tests cover permission, branch scope, duplicate idempotency and missing cash session errors.

## 2. Database And Seed Data

- [x] 2.1 Create a versioned Supabase migration for payments, payment allocations if needed, cash register sessions and cash movements, and verify the migration file includes tenant/branch indexes and foreign keys.
- [x] 2.2 Add RLS/policies or equivalent database checks for payment and cash tables, and verify migration validation detects tenant and branch scoping.
- [x] 2.3 Add uniqueness constraints for payment idempotency keys and one open cash session per tenant branch, and verify migration validation covers duplicate prevention.
- [x] 2.4 Add transactional database functions for receive payment and cash close/refund paths where atomic multi-table writes are required, and verify SQL tests or migration validation cover rollback-sensitive behavior.
- [x] 2.5 Extend development seed data with one open cash session, payable Comandas and payment/cash examples, and verify local data loaders can render both unpaid and paid states.

## 3. Domain And Application Services

- [x] 3.1 Create `payments` module boundaries with `domain`, `application`, `infrastructure` and `presentation` exports, and verify module index exports resolve in typecheck.
- [x] 3.2 Implement payment domain helpers for amount due, split payment totals, cash change and refundable amount, and verify focused unit tests cover exact cents arithmetic.
- [x] 3.3 Implement `PaymentApplicationService.receivePayment` with authorization, order state validation, branch scope checks and idempotency handling, and verify service tests cover success, partial payment, over-cash change and duplicate receive.
- [x] 3.4 Implement `PaymentApplicationService.refundPayment` or correction path with `payments.refund` authorization and immutable reversal behavior, and verify tests preserve original paid payment records.
- [x] 3.5 Create `cash-register` module boundaries with domain/application/infrastructure/presentation exports, and verify module index exports resolve in typecheck.
- [x] 3.6 Implement `CashRegisterApplicationService` for open session, current session summary, withdrawal, cash-in and close session, and verify service tests cover duplicate open, missing open session, divergence note and closed-session mutation denial.
- [x] 3.7 Extend order application behavior so paid closure is only available through the payment service, and verify existing order item/status tests still pass plus new paid-state tests.
- [x] 3.8 Record audit events for payment received/refunded, order paid, cash opened, cash movement and cash closed, and verify fake audit sink tests capture actor, tenant, branch, action and result.

## 4. Infrastructure And APIs

- [x] 4.1 Implement Supabase payment repository methods using tenant-scoped queries and transactional RPC for receive/refund operations, and verify repository mapping tests or integration-style tests parse returned rows correctly.
- [x] 4.2 Implement Supabase cash register repository methods for current session, open, movement listing and close, and verify tenant/branch scoped query tests cover out-of-scope access.
- [x] 4.3 Add `POST /api/v1/payments`, payment listing/detail as needed and refund endpoint, and verify route handler tests cover success, validation error, unauthorized actor and duplicate idempotency responses.
- [x] 4.4 Add `GET/POST /api/v1/cash-register` for current/open session and close action, and verify route handler tests cover permission denied, missing session and closed session states.
- [x] 4.5 Add `GET/POST /api/v1/cash-movements` for movement listing, sangria and reforco, and verify route handler tests cover reason requirements and branch scope denial.
- [x] 4.6 Ensure all payment/cash API responses use stable error envelopes with request ids and no tenant leakage, and verify shared presentation tests cover sanitized errors.

## 5. UX/UI Data Loading

- [x] 5.1 Extend Comanda data models with payment summary, amount due, paid status and receive-payment permissions, and verify `order-data` tests cover unpaid, partially paid, paid, offline and permission-denied states.
- [x] 5.2 Add cash register data loading model for `/caixa` with session status, expected cash, method totals, movements and allowed actions, and verify data tests cover no open session, open session and closed session states.
- [x] 5.3 Update navigation models to expose Caixa and payment actions only when permissions and entitlements allow them, and verify navigation tests cover owner, receptionist, finance and professional roles.

## 6. UX/UI Screens And Components

- [x] 6.1 Build a responsive receive-payment component from the Comanda surface with method selection, split payment rows, remaining amount, cash received and change due, and verify component tests render mobile-safe labels and disabled states.
- [x] 6.2 Wire the Comanda receive action to the payment API with loading, success, error, offline and permission-denied feedback, and verify component tests cover successful payment and recoverable API failure.
- [x] 6.3 Update Comanda totals and history UI to show paid/partially paid states without presenting paid totals as still due, and verify `OrderView` tests cover paid and partially paid Comandas.
- [x] 6.4 Build `/caixa` responsive screen for opening cash, current session summary, method totals, sangria, reforco, movement list and close flow, and verify component tests cover mobile, tablet and desktop structural rendering.
- [x] 6.5 Add accessible form labels, focus states and touch-sized controls for payment and cash screens, and verify tests or snapshots cover key labels and disabled controls.

## 7. E2E And Validation

- [x] 7.1 Add E2E coverage for `agenda -> check-in -> Comanda -> pagamento -> caixa` and verify the Playwright test passes on mobile and desktop viewports.
- [x] 7.2 Add E2E coverage for `walk-in -> nova Comanda -> itens -> pagamento dividido -> caixa` and verify the Playwright test passes on mobile and desktop viewports.
- [x] 7.3 Add a migration validation script or extend the existing validator for payments/cash schema, RLS, indexes, idempotency and seed checks, and verify `npm run validate:payments` or equivalent passes.
- [x] 7.4 Run focused unit/API/component tests for contracts, orders, payments, cash register, order data, navigation and payment/cash UI, and verify the selected `npx vitest run` command passes.
- [x] 7.5 Run `openspec validate payments-cash-register --strict` and verify the change remains valid after implementation task updates.
- [x] 7.6 Run the full validation gate with `npm run validate` and verify format, lint, typecheck, unit tests and build all pass.

