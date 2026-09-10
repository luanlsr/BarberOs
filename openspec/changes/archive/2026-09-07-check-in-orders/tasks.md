# Tasks: Check-in e Comanda

## 1. Contracts And Permissions

- [x] 1.1 Add shared contracts for `Order`, `OrderItem`, order status, item source type, request/response schemas and error codes.
- [x] 1.2 Add server-side permissions for order read/create/update/item management and check-in execution.
- [x] 1.3 Add contract tests for invalid status transitions, item quantity, discounts and final amount validation.

## 2. Database

- [x] 2.1 Create migration for `orders`, `order_items` and `order_history`.
- [x] 2.2 Add tenant/branch indexes, appointment linkage, idempotency support and uniqueness for one active order per appointment.
- [x] 2.3 Add RLS/policies or equivalent database checks consistent with the foundation tenant isolation model.
- [x] 2.4 Add development seed data for at least one open Comanda and one appointment eligible for check-in.

## 3. Domain And Application Services

- [x] 3.1 Create the orders module boundaries following `domain`, `application`, `infrastructure` and `presentation` patterns.
- [x] 3.2 Implement `OrderApplicationService` for walk-in create, list, detail and tenant/branch-scoped reads.
- [x] 3.3 Implement transacional check-in from appointment to `CHECKED_IN` plus opened `Order` and service `OrderItem` snapshots.
- [x] 3.4 Implement add/update/remove item operations and server-side total recalculation.
- [x] 3.5 Record order history and audit events for check-in, status changes and item mutations.

## 4. API

- [x] 4.1 Implement `POST /api/v1/check-in`.
- [x] 4.2 Implement `GET /api/v1/orders`, `POST /api/v1/orders` and `GET /api/v1/orders/:id`.
- [x] 4.3 Implement item mutation endpoints under `/api/v1/orders/:id/items`.
- [x] 4.4 Ensure API errors include stable codes, request ids and no tenant leakage.

## 5. UX/UI

- [x] 5.1 Add check-in action to agenda appointment cards/details for eligible statuses and permissions.
- [x] 5.2 Build responsive Comanda surface with customer, professional, origin, status, items, totals, discounts and notes.
- [x] 5.3 Add item management controls with loading, disabled, error, empty, offline and permission-denied states.
- [x] 5.4 Build walk-in flow for opening a new Comanda without appointment.
- [x] 5.5 Verify touch targets, keyboard flow, light/dark themes and mobile/tablet/desktop layouts.

## 6. Quality Gates

- [x] 6.1 Add unit/integration tests for tenant isolation, branch scope, check-in transaction rollback and idempotency.
- [x] 6.2 Add E2E coverage for `agenda -> check-in -> comanda aberta`.
- [x] 6.3 Add E2E coverage for `walk-in -> nova comanda -> itens manuais`.
- [x] 6.4 Run `npm run validate`, migration validation, relevant E2E tests and `openspec validate check-in-orders --strict`.

## Progress

- Current change implementation: 25/25 tasks complete (100%).
- Estimated full PRD product progress: 34%.
