# orders Specification

## Purpose

Definir a Comanda operacional do BarberOS. No codigo, a entidade e `Order`; na interface, o termo exibido ao usuario e "Comanda".

## Requirements

### Requirement: Order Records

The system SHALL store orders as tenant-scoped, branch-scoped operational records that represent Comandas before payment.

#### Scenario: Appointment-originated order is opened

- **GIVEN** an authenticated actor with order/check-in permission in the appointment branch
- **WHEN** the actor checks in an eligible appointment
- **THEN** the system creates an `Order` with the same `tenant_id`, `branch_id`, `customer_id`, `professional_id` and `appointment_id`
- **AND** the order status is `OPEN` or `IN_SERVICE` according to the application state transition
- **AND** the order is not visible to actors outside the tenant or outside their allowed branch scope.

#### Scenario: Walk-in order is opened

- **GIVEN** an authenticated actor with order create permission in a branch
- **WHEN** the actor opens a Comanda without an appointment
- **THEN** the system creates an `Order` without `appointment_id`
- **AND** the customer may be selected, quickly created or left empty when permitted
- **AND** the order remains tenant-scoped and branch-scoped.

### Requirement: Order Item Snapshots

The system SHALL store every `OrderItem` with a snapshot of the sold or performed item at the time it is added to the Comanda.

#### Scenario: Scheduled service becomes order item

- **GIVEN** an appointment with scheduled service data
- **WHEN** check-in opens the linked Comanda
- **THEN** each scheduled service is copied into an `OrderItem`
- **AND** the item stores snapshot name, source type, source id, quantity, unit price, discount amount and final amount
- **AND** later changes to the service catalog do not mutate the existing item snapshot.

#### Scenario: Manual item is added

- **GIVEN** an open Comanda and an authenticated actor with item management permission
- **WHEN** the actor adds a manual item
- **THEN** the system stores the item snapshot and recalculates order totals server-side.

### Requirement: Order Totals

The system SHALL calculate order subtotal, discounts and total on the server from persisted order items.

#### Scenario: Item discount changes

- **GIVEN** an open Comanda with persisted items
- **WHEN** an authorized actor updates quantity or discount for an item
- **THEN** the system validates the values
- **AND** recalculates subtotal, discount and total
- **AND** returns the updated Comanda detail.

#### Scenario: Client sends conflicting totals

- **GIVEN** an order mutation request containing client-provided totals
- **WHEN** the server processes the request
- **THEN** the server ignores or rejects client totals according to the API contract
- **AND** persists only totals derived from server-side item calculation.

### Requirement: Transactional Check-In

The system SHALL execute appointment check-in and Comanda opening as one atomic operation.

#### Scenario: Check-in succeeds

- **GIVEN** an appointment in an eligible status and branch scope
- **WHEN** an authorized actor performs check-in
- **THEN** the appointment status changes to `CHECKED_IN`
- **AND** one linked Comanda is opened
- **AND** scheduled services become `OrderItem` snapshots
- **AND** appointment history, order history and audit records are written.

#### Scenario: Check-in fails during order creation

- **GIVEN** an eligible appointment
- **WHEN** order creation or item snapshot persistence fails
- **THEN** the appointment status remains unchanged
- **AND** no partial Comanda or partial items are left committed.

#### Scenario: Check-in is repeated idempotently

- **GIVEN** an appointment already checked in through a completed request
- **WHEN** the same idempotency key or equivalent safe retry is submitted
- **THEN** the system returns the existing linked Comanda
- **AND** does not duplicate items or history entries.

### Requirement: Order Authorization

The system SHALL enforce tenant, branch and permission checks server-side for all order operations.

#### Scenario: Cross-tenant read is denied

- **GIVEN** an order belonging to Tenant A
- **WHEN** a Tenant B actor requests the order
- **THEN** the system returns not found or forbidden without leaking Tenant A data.

#### Scenario: Out-of-scope branch mutation is denied

- **GIVEN** an actor scoped to Branch A
- **WHEN** the actor tries to mutate an order in Branch B
- **THEN** the system rejects the operation
- **AND** no order or item state changes.

### Requirement: Comanda Experience

The system SHALL provide a responsive operational Comanda surface using the term "Comanda" in the UI.

#### Scenario: User opens a Comanda detail

- **GIVEN** an authenticated actor with order read permission
- **WHEN** the actor opens a Comanda
- **THEN** the UI displays customer, professional, origin, status, items, notes, subtotal, discounts and total
- **AND** the layout works on mobile, tablet and desktop.

#### Scenario: Actor lacks item permission

- **GIVEN** an actor who can read but not mutate Comandas
- **WHEN** the actor opens a Comanda
- **THEN** mutation controls are disabled or hidden
- **AND** the UI communicates the permission-denied state without exposing forbidden actions.

### Requirement: Payment-Gated Order Closure

The system SHALL close or mark a Comanda as paid only through validated payment completion that covers the Comanda total.

#### Scenario: Fully paid Comanda closes

- **WHEN** authorized payment records cover the full Comanda total
- **THEN** the Comanda leaves the active unpaid workflow
- **AND** the Comanda exposes closed_at and paid status information to authorized users.

#### Scenario: Partially paid Comanda remains open

- **WHEN** authorized payment records cover only part of the Comanda total
- **THEN** the Comanda remains available for further payment
- **AND** the system exposes remaining amount due.

#### Scenario: Direct paid status update is rejected

- **WHEN** a client attempts to set a Comanda to paid or closed without the payment completion workflow
- **THEN** the system rejects the transition
- **AND** no payment, order or cash state is mutated.

### Requirement: Payment-Aware Comanda Experience

The system SHALL expose payment readiness and payment completion from the Comanda experience using the UI term "Comanda".

#### Scenario: User opens payment from Comanda

- **WHEN** an authorized actor opens an unpaid Comanda with payable total
- **THEN** the UI displays a receive-payment action with the amount due
- **AND** the action is disabled or hidden when payment permission, entitlement, connectivity or order state does not allow payment.

#### Scenario: Payment complete feedback

- **WHEN** Comanda payment completes successfully
- **THEN** the UI confirms the paid amount and methods used
- **AND** offers the next operational actions without presenting unpaid totals as still due.

### Requirement: Commission Source Attribution

The system SHALL keep enough item-level attribution on Comandas to determine the professional, item type and source amount used for commission accrual after payment completion.

#### Scenario: Service item has responsible professional

- **WHEN** a scheduled or manual service item is added to a Comanda
- **THEN** the item exposes the responsible professional used for production and commission calculations
- **AND** later changes to professional assignment do not silently mutate historical paid commission sources.

#### Scenario: Product item has optional commission attribution

- **WHEN** a product or manual sale item is added to a Comanda with commission eligibility
- **THEN** the item exposes the professional attribution or explicitly records that no professional commission applies.

#### Scenario: Paid item attribution is immutable

- **WHEN** a Comanda item has contributed to a paid commission accrual
- **THEN** correcting the attribution requires an auditable adjustment instead of silently editing the historical commission source.

### Requirement: Product Catalog Order Items

The system SHALL allow authorized actors to add active catalog products to Comandas while preserving product sale snapshots and without creating stock movements before payment completion.

#### Scenario: Product item is added from catalog

- **WHEN** an authorized actor adds an active product from the catalog to an open Comanda
- **THEN** the order item stores product source type, product source id, name snapshot, quantity, unit sale price, optional cost snapshot, discount and final amount
- **AND** the item remains tenant-scoped and branch-scoped to the Comanda.

#### Scenario: Product unavailable for branch

- **WHEN** an actor attempts to add a product outside the Comanda branch scope or tenant
- **THEN** the system rejects the item without exposing out-of-scope product data.

#### Scenario: Unpaid product item is changed

- **WHEN** a product item is updated or removed before payment completion
- **THEN** the system recalculates Comanda totals server-side
- **AND** does not create stock movement history for the unpaid transient state.