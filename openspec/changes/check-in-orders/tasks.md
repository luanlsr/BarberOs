# Tasks: Check-in e Comanda

## 1. Contracts And Permissions

- [ ] 1.1 Add shared contracts for `Order`, `OrderItem`, order status, item source type, request/response schemas and error codes.
- [ ] 1.2 Add server-side permissions for order read/create/update/item management and check-in execution.
- [ ] 1.3 Add contract tests for invalid status transitions, item quantity, discounts and final amount validation.

## 2. Database

- [ ] 2.1 Create migration for `orders`, `order_items` and `order_history`.
- [ ] 2.2 Add tenant/branch indexes, appointment linkage, idempotency support and uniqueness for one active order per appointment.
- [ ] 2.3 Add RLS/policies or equivalent database checks consistent with the foundation tenant isolation model.
- [ ] 2.4 Add development seed data for at least one open Comanda and one appointment eligible for check-in.

## 3. Domain And Application Services

- [ ] 3.1 Create the orders module boundaries following `domain`, `application`, `infrastructure` and `presentation` patterns.
- [ ] 3.2 Implement `OrderApplicationService` for walk-in create, list, detail and tenant/branch-scoped reads.
- [ ] 3.3 Implement transacional check-in from appointment to `CHECKED_IN` plus opened `Order` and service `OrderItem` snapshots.
- [ ] 3.4 Implement add/update/remove item operations and server-side total recalculation.
- [ ] 3.5 Record order history and audit events for check-in, status changes and item mutations.

## 4. API

- [ ] 4.1 Implement `POST /api/v1/check-in`.
- [ ] 4.2 Implement `GET /api/v1/orders`, `POST /api/v1/orders` and `GET /api/v1/orders/:id`.
- [ ] 4.3 Implement item mutation endpoints under `/api/v1/orders/:id/items`.
- [ ] 4.4 Ensure API errors include stable codes, request ids and no tenant leakage.

## 5. UX/UI

- [ ] 5.1 Add check-in action to agenda appointment cards/details for eligible statuses and permissions.
- [ ] 5.2 Build responsive Comanda surface with customer, professional, origin, status, items, totals, discounts and notes.
- [ ] 5.3 Add item management controls with loading, disabled, error, empty, offline and permission-denied states.
- [ ] 5.4 Build walk-in flow for opening a new Comanda without appointment.
- [ ] 5.5 Verify touch targets, keyboard flow, light/dark themes and mobile/tablet/desktop layouts.

## 6. Quality Gates

- [ ] 6.1 Add unit/integration tests for tenant isolation, branch scope, check-in transaction rollback and idempotency.
- [ ] 6.2 Add E2E coverage for `agenda -> check-in -> comanda aberta`.
- [ ] 6.3 Add E2E coverage for `walk-in -> nova comanda -> itens manuais`.
- [ ] 6.4 Run `npm run validate`, migration validation, relevant E2E tests and `openspec validate check-in-orders --strict`.

## Progress

- Current change implementation: 0/25 tasks complete (0%).
- Estimated full PRD product progress: 20%.
