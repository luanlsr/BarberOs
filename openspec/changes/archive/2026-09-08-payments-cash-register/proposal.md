## Why

Comandas ja podem ser abertas por check-in ou walk-in, mas o ciclo operacional ainda para antes do recebimento. Este change fecha o fluxo P0 de PDV ao permitir receber pagamentos auditaveis, encerrar a Comanda paga e controlar a sessao de caixa da filial.

## What Changes

- Add payment contracts, domain service boundaries, persistence and APIs for receiving one or more manual payment methods against an open Comanda.
- Add cash register session and movement contracts, persistence and APIs for opening cash, recording sangria/reforco and closing cash with expected versus actual balances.
- Update the orders behavior so a Comanda can move to paid/closed only after payments cover the amount due, without overwriting paid transactions.
- Add payment UI from the Comanda surface with split payment, cash change, permission/offline states and completion feedback.
- Add cash register UI for status, opening balance, payment totals, withdrawal, cash-in and close divergence review.
- Add audit/idempotency requirements for payment and cash operations, including duplicate receive protection.
- No breaking changes intended; existing check-in and walk-in Comanda flows remain valid.

## Capabilities

### New Capabilities

- `payments`: Manual payment lifecycle for Comandas, split methods, idempotency, refunds/corrections and server-side authorization.
- `cash-register`: Branch cash sessions, cash movements, opening/closing workflow and expected balance reconciliation.

### Modified Capabilities

- `orders`: Comandas can be closed as paid only through validated payment completion and expose payment-ready state to the UI.
- `application-shell`: Navigation and central actions expose Caixa/Pagamento entry points only when permissions and entitlements allow them.

## Impact

- Affected code: `packages/contracts`, `apps/web/src/modules/orders`, new `apps/web/src/modules/payments`, new `apps/web/src/modules/cash-register`, `apps/web/app/api/v1/payments`, `apps/web/app/api/v1/cash-register`, `apps/web/app/api/v1/cash-movements`, `apps/web/app/comandas`, and likely a new `apps/web/app/caixa` screen.
- Affected database: new Supabase migration for payments, payment allocations, cash register sessions, cash movements, indexes, idempotency keys and RLS/policies.
- Affected UI: Comanda totals/payment area, payment confirmation workflow, cash register status/close screens, shell navigation and responsive states.
- Affected quality gates: contract tests, application service tests for tenant/branch isolation and duplicate payment prevention, migration validation, E2E check-in -> Comanda -> payment -> cash and walk-in -> payment -> cash.