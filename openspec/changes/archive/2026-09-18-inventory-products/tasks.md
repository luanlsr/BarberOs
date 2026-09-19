# Tasks: Estoque e Catalogo Operacional

## 1. Contracts And Permission Catalog

- [x] 1.1 Add catalog and inventory enums for product status, stock movement type, stock source type, stock alert state and stock tracking policy in `packages/contracts`, and verify contract tests cover valid and invalid enum values.
- [x] 1.2 Add `ProductCategory`, `Product`, `InventoryLocation`, `StockMovement`, `StockBalance`, `LowStockAlert` and product detail/list response schemas with tenant/branch fields, sale/cost amounts, supplier metadata and timestamps, and verify parsing tests reject invalid scope, negative money where invalid and missing required product identity.
- [x] 1.3 Add create/update/archive product category and product command schemas, including stock tracking and negative-stock policy fields, and verify tests cover archived categories, inactive products and branch applicability.
- [x] 1.4 Add stock entry, sale effect, loss, consumption, adjustment and transfer command schemas with idempotency keys for critical writes, and verify tests cover signed quantity rules, required reasons and duplicate-safe command shape.
- [x] 1.5 Add stable API error codes for catalog and inventory failures, including permission, entitlement, branch scope, product unavailable, insufficient stock, duplicate idempotency and immutable movement errors, and verify shared API error tests cover sanitized envelopes.

## 2. Database And Seed Data

- [x] 2.1 Create a versioned Supabase migration for product categories, products, inventory locations and stock movements, and verify migration validation detects tenant/branch indexes, foreign keys and required check constraints.
- [x] 2.2 Add RLS/policies or equivalent database checks for catalog and inventory tables, and verify migration validation detects tenant isolation, branch scope and inventory entitlement-sensitive access paths.
- [x] 2.3 Add uniqueness/idempotency constraints for stock movement commands and payment-derived product sale movements, and verify migration validation covers duplicate prevention by source order item/payment.
- [x] 2.4 Add transactional database functions or repository transaction boundaries for product-sale stock effects during payment completion, and verify validation or repository tests cover rollback-sensitive behavior.
- [x] 2.5 Extend development seed data with product categories, active/inactive products, inventory locations, stock entries, low-stock products and one paid product sale scenario, and verify local data loaders can render populated, empty and low-stock states.

## 3. Catalog Domain And Application Services

- [x] 3.1 Create `catalog` module boundaries with `domain`, `application`, `infrastructure` and `presentation` exports, and verify module index exports resolve in typecheck.
- [x] 3.2 Implement catalog domain helpers for active product visibility, branch applicability, archived category guards, sale/cost snapshot creation and product search filtering, and verify focused unit tests cover edge cases.
- [x] 3.3 Implement `CatalogApplicationService` read methods for product list/detail and category list with authorization, entitlement and branch scope checks, and verify service tests cover owner, manager, receptionist and forbidden actors.
- [x] 3.4 Implement product category create/update/archive workflows with audit events and safe archived-category behavior, and verify service tests cover permission denial and historical snapshot readability.
- [x] 3.5 Implement product create/update/archive workflows with stock tracking, negative-stock policy, supplier metadata and active/inactive status, and verify service tests cover branch mismatch, tenant leakage and archived product behavior.

## 4. Inventory Domain And Application Services

- [x] 4.1 Create `inventory` module boundaries with `domain`, `application`, `infrastructure` and `presentation` exports, and verify module index exports resolve in typecheck.
- [x] 4.2 Implement inventory domain helpers for signed stock movement quantities, projected balance calculation, low-stock evaluation and insufficient-stock policy, and verify focused unit tests cover exact integer quantity arithmetic.
- [x] 4.3 Implement `InventoryApplicationService` read methods for stock balances, movement history and low-stock alerts with authorization, entitlement and branch scope checks, and verify service tests cover tenant and branch isolation.
- [x] 4.4 Implement stock entry, loss, consumption and adjustment workflows as immutable movements with required reasons where applicable, and verify service tests cover idempotency, audit events and previous movement preservation.
- [x] 4.5 Implement transfer workflow between allowed branch/location scopes when supported by the initial schema, and verify service tests cover source/destination scope denial and balanced movement pairs.
- [x] 4.6 Implement payment-derived `SALE` stock effects for tracked product items with source uniqueness and negative-stock policy checks, and verify service tests cover sufficient stock, insufficient stock, negative-stock override and duplicate retry.

## 5. Payment, Order And Finance Integration

- [x] 5.1 Extend order item product workflows to validate active catalog products and store product sale/cost snapshots, and verify order service tests cover product unavailable, branch mismatch and unpaid product removal without stock movement.
- [x] 5.2 Extend order data/loading models and Comanda item controls to distinguish catalog products from manual items, and verify component or data tests cover product labels, totals and disabled states.
- [x] 5.3 Extend payment completion orchestration to create inventory sale movements atomically with order closure, cash, finance, commission and audit effects, and verify payment service tests cover rollback when stock persistence fails.
- [x] 5.4 Extend finance entry creation so paid product items produce product revenue source metadata, and verify finance tests cover product revenue totals without corrupting service revenue totals.
- [x] 5.5 Preserve product commission eligibility through existing commission rule/source behavior, and verify commission tests cover product item accrual when a matching product rule exists and no accrual when no rule matches.

## 6. Infrastructure And APIs

- [x] 6.1 Implement Supabase catalog repository methods using tenant-scoped and branch-scoped queries, and verify repository mapping tests parse returned rows and reject out-of-scope data.
- [x] 6.2 Implement Supabase inventory repository methods for locations, movements, balances, low-stock alerts and source uniqueness, and verify repository tests cover tenant/branch filters and idempotent movement persistence.
- [x] 6.3 Add `GET/POST/PATCH /api/v1/product-categories` and product category archive behavior, and verify route handler tests cover validation errors, unauthorized actors and sanitized errors.
- [x] 6.4 Add `GET/POST/PATCH /api/v1/products` plus detail/archive behavior, and verify route handler tests cover search filters, branch filters, inactive products and permission denial.
- [x] 6.5 Add `GET /api/v1/inventory/balances`, `GET /api/v1/inventory/movements`, `GET /api/v1/inventory/alerts` and stock movement write endpoints, and verify route handler tests cover idempotency, insufficient stock and branch scope denial.
- [x] 6.6 Ensure all catalog/inventory API responses use stable error envelopes with request ids and no tenant leakage, and verify shared presentation tests cover sanitized inventory errors.

## 7. UX/UI Data Loading

- [x] 7.1 Add Produtos data loading model with product list, categories, active/inactive status, price, cost, supplier metadata, stock tracking state and allowed actions, and verify data tests cover populated, empty, error, offline and permission-denied states.
- [x] 7.2 Add Estoque data loading model with balances, low-stock alerts, movement history, movement type labels and allowed actions, and verify data tests cover normal, low-stock, zero-stock, empty and branch-scoped states.
- [x] 7.3 Add product catalog selection model for Comanda/PDV with search, category filtering, favorites or common products, product availability and disabled reasons, and verify data tests cover active products, inactive products and branch-unavailable products.
- [x] 7.4 Update navigation models to expose Produtos, Estoque and product sale actions only when permissions and entitlements allow them, and verify navigation tests cover owner, manager, finance, receptionist and professional roles.

## 8. UX/UI Screens And Components

- [x] 8.1 Build `/produtos` responsive product management screen with search, category filters, product status, price/cost, stock tracking indicators and product form/drawer, and verify component tests cover mobile, tablet and desktop structural rendering.
- [x] 8.2 Build `/estoque` responsive inventory screen with low-stock alerts, stock balances, movement history, manual entry/loss/adjustment flows and disabled/offline states, and verify component tests cover loading, empty, error, permission-denied and low-stock states.
- [x] 8.3 Build product detail/history surface with sale metadata, current stock, minimum stock, supplier metadata and movement timeline, and verify component tests cover tracked and non-tracked products.
- [x] 8.4 Integrate catalog product picker into the Comanda/PDV experience with touch-sized controls and search/category filters, and verify `OrderView` or product picker tests cover adding product items and disabled unavailable products.
- [x] 8.5 Add accessible labels, focus states and touch-sized controls for product, stock movement and product picker workflows, and verify tests or snapshots cover key labels and disabled controls.

## 9. E2E And Validation

- [x] 9.1 Add E2E coverage for `walk-in -> produto na Comanda -> pagamento -> baixa de estoque -> financeiro` and verify the Playwright test passes on mobile and desktop viewports.
- [x] 9.2 Add E2E coverage for `produto baixo estoque -> entrada de estoque -> alerta resolvido` and verify the Playwright test passes on mobile and desktop viewports.
- [x] 9.3 Add or extend migration validation scripts for catalog/inventory schema, RLS, indexes, idempotency, source uniqueness and seed checks, and verify `npm run validate:inventory` or equivalent passes.
- [x] 9.4 Run focused unit/API/component tests for contracts, catalog, inventory, payments, orders, finance, navigation and product/stock UI, and verify the selected `npx vitest run` command passes.
- [x] 9.5 Run `openspec validate inventory-products --strict` and verify the change remains valid after implementation task updates.
- [x] 9.6 Run the full validation gate with `npm run validate` and verify format, lint, typecheck, unit tests and build all pass.




