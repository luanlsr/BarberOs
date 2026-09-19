## Why

Comandas, pagamentos, caixa, financeiro e comissoes ja cobrem o ciclo de atendimento, mas a venda de produtos ainda depende de itens manuais sem catalogo operacional nem baixa auditavel de estoque. Este change fecha o proximo loop do MVP: produto vendido na Comanda -> pagamento -> baixa de estoque -> receita de produto -> alerta de reposicao.

## What Changes

- Add catalog/product contracts for product categories, products, sellable status, pricing, cost snapshots, supplier metadata, stock policy and product search/list/detail responses.
- Add inventory contracts for stock locations, immutable stock movements, stock balance summaries, low-stock alerts and adjustment/transfer commands with idempotency keys where writes are critical.
- Add Supabase persistence for product categories, products, inventory locations and stock movements with tenant/branch scope, RLS/policies, indexes and source uniqueness for paid-order stock effects.
- Add `catalog` and `inventory` modules following the existing domain/application/infrastructure/presentation boundaries.
- Allow order item creation from active catalog products while preserving product name, type, quantity, price, cost and professional/commission attribution snapshots.
- Generate stock `SALE` movements only when a Comanda payment completes, not when a product is temporarily added to or removed from an unpaid Comanda.
- Feed paid product sales into finance as product revenue, keeping cash register and financial side effects consistent with existing payment completion behavior.
- Add product and stock UI/data models for Produtos e Estoque with low-stock focus, product detail/history, manual stock entry, loss and adjustment workflows.
- Update shell/navigation and primary actions to expose Produtos, Estoque and product sale flows only by permission and entitlement.
- No barcode scanning, supplier purchase automation, fiscal issuance, advanced procurement, multi-warehouse transfer approval or offline stock sync in this change.

## Capabilities

### New Capabilities

- `catalog`: Product categories, products, supplier metadata, sale/cost snapshots and product list/detail behavior for the operational POS catalog.
- `inventory`: Stock locations, immutable stock movements, balance projections, low-stock alerts and auditable stock adjustments by tenant and branch.

### Modified Capabilities

- `orders`: Comanda items can be added from active catalog products and must keep product snapshots without creating stock movements before payment completion.
- `payments`: Payment completion creates product stock movements atomically with existing Comanda, cash, finance, commission and audit effects.
- `finance`: Paid product items create product revenue entries and expose product revenue/margin-ready source metadata in finance summaries.
- `application-shell`: Produtos, Estoque and product sale actions are permission-aware and entitlement-aware in desktop, tablet and mobile navigation surfaces.

## Impact

- Affected code: `packages/contracts`, new `apps/web/src/modules/catalog`, new `apps/web/src/modules/inventory`, existing `apps/web/src/modules/orders`, `apps/web/src/modules/payments`, `apps/web/src/modules/finance`, `apps/web/lib/navigation.ts`, product/stock data loaders and product/stock UI components.
- Affected database: versioned Supabase migration for product categories, products, inventory locations and stock movements with tenant/branch indexes, uniqueness/idempotency constraints, source references and RLS/policies.
- Affected APIs: catalog/product list/detail/create/update/archive endpoints, inventory stock movement/balance endpoints and payment completion persistence paths for product-sale stock effects.
- Affected UI: Produtos, Estoque, product detail/history, low-stock alert surface, catalog selection in Comanda/PDV and shell/central actions.
- Affected quality gates: contract tests, domain stock arithmetic tests, tenant/branch isolation tests, route handler tests for authorization/idempotency, migration validation, component tests for responsive states, E2E walk-in -> produto na Comanda -> pagamento -> baixa de estoque -> financeiro, and full `npm run validate`.