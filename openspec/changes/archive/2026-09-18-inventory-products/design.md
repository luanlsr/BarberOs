## Context

See `proposal.md` for motivation. The current codebase already has the modular monolith shape for orders, payments, cash register, finance and commissions, with shared Zod contracts in `packages/contracts`, module boundaries under `apps/web/src/modules/*`, versioned Supabase migrations and route-handler tests. Inventory permissions and the `inventory` entitlement already exist in seed/session context, and `OrderItem` already supports `sourceType: 'PRODUCT'`, but there is no catalog or inventory module yet.

The architecture requires stock records to be auditable and preferably immutable. Product sales must join the existing paid Comanda flow without creating stock history for unpaid cart edits. UI must stay operational and mobile-first: owners/managers need quick low-stock visibility, while reception needs fast product selection inside the Comanda/PDV flow.

## Goals / Non-Goals

**Goals:**

- Add `catalog` and `inventory` modules using the existing domain/application/infrastructure/presentation pattern.
- Model products and product categories as tenant-scoped catalog records with branch applicability, sale price, optional cost metadata, stock tracking, negative-stock policy and supplier metadata.
- Model stock as immutable movements plus balance projections/read models rather than direct destructive product stock edits.
- Generate stock `SALE` movements from paid product order items during payment completion, with source uniqueness and idempotent retry behavior.
- Expose product revenue attribution in finance while preserving existing cash/payment/commission side effects.
- Build Produtos/Estoque data loaders and screens with low-stock focus, product detail/history and permission-aware states.

**Non-Goals:**

- Barcode scanning, camera flows, QR inventory, purchase orders, supplier automation or procurement approvals.
- Fiscal/NFS-e/receipt issuance, tax calculation or accounting-grade COGS reporting.
- Stock reservations for unpaid Comandas or offline stock sync.
- Worker/outbox delivery for low-stock notifications; this change can expose alerts synchronously and leave push/message delivery for the worker/notifications change.

## Decisions

### Split catalog from inventory

Create `catalog` for what can be sold and shown in the POS, and `inventory` for quantities and movement history. Products belong to catalog; stock locations, balances and movements belong to inventory.

Rationale: not every product needs stock tracking, and future catalog items may include services, packages or non-stock sales. Keeping stock behavior separate avoids making every saleable thing an inventory record.

Alternative considered: a single `products` module with current stock on each product. That is faster initially, but it mixes sales metadata with auditable stock history and makes branch-specific stock harder to maintain.

### StockMovement is the audit source of truth

Represent stock changes as append-only movements with signed quantity, type, tenant, branch/location, product, source type/id, actor, reason and idempotency key. Current balance can be computed or stored as a projection/read model, but corrections use adjustment movements.

Rationale: this matches the financial/cash design and prevents silent inventory edits. It also keeps later reconciliation, low-stock jobs and audit review possible.

Alternative considered: update a `stock_quantity` field directly on product. That is simple but loses why stock changed and makes paid-order/retry failures hard to audit.

### Product snapshots live on OrderItem

When adding a catalog product to a Comanda, the order item stores the product source id plus name, quantity, sale price, final amount and optional cost snapshot needed for later finance/margin views. It does not depend on the live product price after being added.

Rationale: order/payment history must remain stable when a product price or cost changes later. This follows the existing service snapshot rule.

Alternative considered: lookup product price at payment time. That can drift from what the customer accepted and breaks historical Comanda totals.

### Stock leaves only after payment completion

Adding/removing products from an unpaid Comanda changes order totals but not stock. Payment completion creates stock `SALE` movements for tracked product items in the same transaction boundary as Comanda closure, payment, finance, commission and audit effects.

Rationale: reception workflows frequently edit a Comanda before payment. Creating stock movements for tentative cart state would require noisy reversals and increase fraud/error risk.

Alternative considered: reserve stock when the item is added. Reservation is useful later, but it increases complexity and is not needed for the MVP loop.

### Source uniqueness protects retries

Use uniqueness/idempotency around stock sale effects, for example by tenant/branch/product/source order item/payment/source type, so payment retries do not duplicate stock movement or revenue side effects.

Rationale: payments are critical writes and already require idempotency. Inventory must follow the same retry contract.

Alternative considered: detect duplicates only in application memory. That fails across deployments and concurrent requests.

### Low-stock is a read model first

Expose low-stock state by comparing projected branch balance to product minimum stock. Persisting alert events can be added later by the worker/outbox change; this change only needs deterministic read behavior and UI surfacing.

Rationale: owners need the operational signal now, but messaging/notification delivery belongs to a later infrastructure/communication slice.

Alternative considered: build full notification workflows now. That would pull worker/outbox scope forward and dilute the inventory MVP.

### UI prioritizes scan-and-act inventory management

Produtos is for maintaining product sale metadata; Estoque is for current stock, low-stock alerts and movement history. Mobile uses searchable lists and product detail screens; tablet/desktop can show product list, stock summary and detail/history side by side. Product selection in Comanda should remain fast and touch-sized.

Rationale: the PRD asks for operational speed and mobile-first PWA behavior. Inventory should not become a spreadsheet-first admin surface.

Alternative considered: expose a wide inventory table first. It is easier to implement but poor on 320px/mobile and misaligned with the design spec.

## Risks / Trade-offs

- Product stock side effect duplicates on payment retry -> enforce idempotency keys and database source uniqueness for stock sale movements.
- Payment transaction becomes too broad -> keep route handlers thin and persist side effects through application/repository transaction boundaries, with tests for rollback-sensitive behavior.
- Insufficient tracked stock can block checkout -> default to blocking payment completion when quantity is unavailable, with an explicit product-level negative-stock override and stable error messaging.
- Branch leakage in product search or stock balance -> require tenant/branch filters in repositories, RLS/policies and explicit service tests for Tenant A/Tenant B access.
- UI too dense for mobile -> split Produtos and Estoque read models, use responsive lists/details, and keep low-stock alerts above full history.
- Product cost may be approximate -> store cost snapshots as operational metadata and avoid presenting accounting-grade margin until a later reporting/accounting slice.

## Migration Plan

1. Expand contracts with catalog product/category, inventory location, stock movement, balance, low-stock alert and command schemas.
2. Add a versioned Supabase migration for product categories, products, inventory locations and stock movements with tenant/branch indexes, RLS/policies, source uniqueness and idempotency constraints.
3. Add `catalog` and `inventory` modules with domain helpers, application services, Supabase repositories and presentation route handlers.
4. Extend order item creation to validate active catalog products and store product snapshots without creating stock movements.
5. Extend payment completion persistence to create product revenue and stock sale movements atomically with existing side effects.
6. Add product/stock data loaders and UI surfaces, then expose navigation/actions by permission and entitlement.
7. Extend seed data and validation scripts for catalog/inventory schema and low-stock scenarios.
8. Add focused unit/API/component tests and E2E coverage for walk-in -> product -> payment -> stock -> finance.

Rollback strategy: use expand-style migrations. Rolling back application code should leave product and stock tables unused but intact. Do not drop stock movement history in the same deployment that removes application usage.

