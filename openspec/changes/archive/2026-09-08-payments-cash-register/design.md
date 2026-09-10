## Context

See `proposal.md` for motivation. The current product already has `Order`, `OrderItem`, order history, check-in and walk-in Comanda flows in the modular monolith. Contracts already reserve permissions for `payments.receive`, `payments.refund`, `cash.open`, `cash.withdraw` and `cash.close`, but there are no payment/cash entities, persistence, APIs or UI flows yet.

The implementation must preserve the existing domain boundaries: Next.js route handlers remain thin adapters, application services receive `RequestContext`, repositories stay tenant/branch scoped, and database migrations enforce tenant isolation as defense in depth. Payment completion is a critical write and must be idempotent, audited and transactional.

## Goals / Non-Goals

**Goals:**

- Introduce manual payments for Comandas with split methods and cash change support.
- Add branch cash register sessions and immutable cash movements.
- Close or mark a Comanda as paid only through the payment workflow.
- Keep payment, cash movement, order closure and audit writes atomic for successful receives.
- Provide responsive payment and cash UI states for mobile, tablet and desktop.
- Cover tenant isolation, branch scope, duplicate receive and critical E2E payment/cash flows.

**Non-Goals:**

- External card/acquirer/PIX provider integration, reconciliation webhooks or fiscal receipt issuance.
- Full financial ledger, commission accrual and inventory stock movement generation; those remain for later roadmap changes, though this change should leave clear extension points.
- Offline payment capture. Offline state should communicate that payment/cash writes require connection.
- Advanced cash drawer hardware, printer integration or multi-currency support.

## Decisions

### Payment status and order closure

Add payment lifecycle contracts with statuses `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED` and `PARTIALLY_REFUNDED`. Add a paid terminal state to the order lifecycle, preferably `PAID`, plus `closedAt` semantics already present on `Order`.

Rationale: payment and order state are related but not identical. A Comanda can have multiple payments, while the order needs one clear operational state for the UI and list filters. Keeping `PAID` on `Order` also removes paid Comandas from the active unpaid queue without requiring every screen to recompute payment state.

Alternative considered: infer order paid state only from payment totals. That avoids one status field, but makes filtering, UI state and future worker events more complex and easier to get wrong.

### One receive-payment application service

Create a `PaymentApplicationService` that coordinates payment validation, payment persistence, order closure and cash-affecting movements. Route handlers should parse request payloads, resolve `RequestContext`, call the service and format stable API responses.

Rationale: receiving payment is a business operation, not a raw insert. It must validate order state, branch scope, permission, remaining balance, supported methods, idempotency and cash session availability in one place.

Alternative considered: add payment methods directly to `OrderApplicationService`. That would keep files fewer but would blur order item management with cash/payment lifecycle concerns as the POS grows.

### Transaction boundary in persistence

Use a database transaction through a Supabase RPC for the receive-payment critical path, following the existing `check_in_appointment_order` precedent. The RPC should create payments, create required cash movements, update order status/closed_at when paid, write order/payment/cash history rows as needed and enforce idempotency key uniqueness.

Rationale: the Supabase client path does not offer a simple multi-table transaction from the application layer. A database function gives atomicity and lets constraints guard duplicate writes even under concurrent requests.

Alternative considered: sequential application-layer writes. That is simpler to code initially, but can leave partial payment/cash/order states on failures and is not acceptable for financial operations.

### Cash session model

Create `cash_register_sessions` as the branch-level open/closed session record and `cash_movements` as the immutable source of expected cash balance. Enforce one open session per tenant/branch with a partial unique index where status is `OPEN`.

Rationale: barbershops need a human-closeable cash workflow, but cash movements must remain auditable. This also allows card/PIX sales to appear in summaries without pretending they change physical cash balance.

Alternative considered: store only daily totals. That is faster for a dashboard but insufficient for sangria, reforco, divergence investigation and audit.

### Payment-to-cash mapping

Only cash-affecting methods create physical cash balance movements. Cash sales create `SALE`; cash refunds create `REFUND`; sangria/reforco are manual `WITHDRAWAL` and `CASH_IN`. PIX/card methods contribute to payment totals and UI summaries but do not increase expected cash-in-drawer.

Rationale: caixa físico and total received are related reports, not the same balance.

Alternative considered: record every payment method as a cash movement. That simplifies one table of totals, but makes expected cash balance misleading.

### UI shape

Extend the Comanda surface with a payment area or drawer/bottom sheet for receiving payment. On mobile, the primary action is a sticky receive button that opens a focused payment flow. On tablet/desktop, payment can appear alongside order totals without turning the POS into a marketing page. Add a `/caixa` operational screen for opening, monitoring, sangria/reforco and closing.

Rationale: the PRD identifies Agenda -> Check-in -> Comanda -> Pagamento as the fastest operational path. Payment must be reachable from the Comanda, while cash management deserves a dedicated branch status surface.

Alternative considered: make payment only part of `/caixa`. That would force reception to leave the Comanda during the highest-frequency flow.

### Initial finance/inventory extension points

Emit or persist enough structured source data to let later `financial-ledger-commissions` and `inventory-products` changes consume `OrderPaid`/payment data without rewriting payment records. If an outbox table is not implemented yet, keep the code boundary ready but do not create a fake worker path.

Rationale: payments are the source for finance, stock and commission, but those modules are sequenced after this change. We should not implement half of them here.

Alternative considered: implement financial entries immediately with payment. That would raise scope and risk, and would duplicate the next roadmap change.

## Risks / Trade-offs

- Payment receives can be submitted twice -> require idempotency keys, database uniqueness and tests for duplicate requests.
- Supabase RPC can hide too much business behavior -> keep contract validation and authorization in application services, and keep the RPC focused on atomic persistence.
- Order status changes could bypass payment rules -> block direct transition to paid in generic order status updates and cover it with tests.
- Cash close divergence can be abused or unclear -> require reason/note for non-zero difference and audit actor, branch, amount and timestamp.
- Split payment UX can become slow on mobile -> default to common methods and keep split mode compact, with remaining amount visible at all times.
- Later finance/commission/inventory modules may need richer events -> model payment/order source fields now and leave explicit TODO-free extension points in interfaces/tests.

## Migration Plan

1. Expand contracts with payment, cash session and cash movement schemas, plus API command/response schemas and stable error codes.
2. Add a versioned Supabase migration for payment/cash tables, indexes, RLS/policies, idempotency uniqueness and transactional receive/refund helpers.
3. Add domain/application/infrastructure/presentation modules for payments and cash-register without removing existing order behavior.
4. Extend orders to expose paid lifecycle fields and reject direct paid closure outside payment completion.
5. Add UI data-loading models and responsive components for payment and cash screens.
6. Seed development data for one open cash session and payable Comanda scenarios.
7. Run contract, application, route, migration, E2E and full validation gates.

Rollback strategy: because this is an expand-style migration, rolling back application code should leave new tables unused. Avoid dropping new tables in the same deployment; a later contract migration can remove them only if no production data depends on them.

## Open Questions

- Which exact provider-specific payment metadata will be needed first for PIX/card integrations can be decided in a later integration change; this change stores only manual reference fields.