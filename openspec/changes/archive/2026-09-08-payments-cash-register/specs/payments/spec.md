## Purpose

Define how BarberOS receives, tracks, authorizes and corrects manual payments for Comandas while preserving tenant isolation, branch scope and auditable payment history.

## ADDED Requirements

### Requirement: Payment Records

The system SHALL store payments as tenant-scoped and branch-scoped records linked to one Comanda, with method, amount, status, actor, timestamps and optional external reference.

#### Scenario: Receive single-method payment

- **WHEN** an authorized actor receives the full amount of an open Comanda using one supported method
- **THEN** the system records a payment for that Comanda with status `PAID`
- **AND** the payment uses the Comanda tenant and branch
- **AND** the payment is not visible outside the tenant or outside the actor branch scope.

#### Scenario: Receive split payment

- **WHEN** an authorized actor receives a Comanda using multiple payment methods
- **THEN** the system records each payment method with its own amount and status
- **AND** the sum of paid amounts determines the remaining amount due for the Comanda.

#### Scenario: Payment is below amount due

- **WHEN** paid amounts do not cover the Comanda total
- **THEN** the system keeps the Comanda unpaid or partially paid
- **AND** exposes the remaining amount due without closing the Comanda as paid.

### Requirement: Payment Methods And Cash Change

The system SHALL support manual payment methods for cash, PIX, debit card, credit card and other configured methods, including cash received and change due when applicable.

#### Scenario: Cash payment with change

- **WHEN** an authorized actor receives cash above the remaining amount due
- **THEN** the system records the paid amount applied to the Comanda
- **AND** exposes the change due to return to the customer
- **AND** does not inflate Comanda revenue by the change amount.

#### Scenario: Unsupported payment method

- **WHEN** a payment request uses a method unavailable to the tenant or unsupported by the system
- **THEN** the system rejects the request with a stable validation error
- **AND** no payment or cash movement is persisted.

### Requirement: Payment Authorization And Idempotency

The system SHALL require server-side authorization, branch scope and an idempotency key for critical payment writes.

#### Scenario: Duplicate receive request

- **WHEN** the same payment receive request is submitted more than once with the same idempotency key
- **THEN** the system returns the original recorded payment result
- **AND** does not duplicate payments, Comanda closure, cash movements or audit events.

#### Scenario: Unauthorized payment receive

- **WHEN** an actor without `payments.receive` attempts to receive payment
- **THEN** the system rejects the operation without mutating the Comanda, payments or cash session.

#### Scenario: Cross-tenant payment access

- **WHEN** a Tenant B actor requests or mutates a payment from Tenant A
- **THEN** the system returns not found or forbidden without leaking Tenant A payment data.

### Requirement: Payment Corrections And Refunds

The system SHALL correct paid transactions through refund or adjustment records instead of destructively overwriting paid payments.

#### Scenario: Refund paid payment

- **WHEN** an authorized actor refunds all or part of a paid payment
- **THEN** the system records a refund/correction with actor, reason, amount and timestamp
- **AND** updates payment lifecycle to `REFUNDED` or `PARTIALLY_REFUNDED` as applicable
- **AND** preserves the original paid payment record.

#### Scenario: Refund requires elevated permission

- **WHEN** an actor without `payments.refund` attempts a refund or correction
- **THEN** the system rejects the operation and records no refund movement.

### Requirement: Payment Completion Effects

The system SHALL complete payment atomically with Comanda closure, cash movement creation and audit records when the paid amount covers the Comanda total.

#### Scenario: Comanda becomes paid

- **WHEN** an authorized payment operation brings the paid total to the Comanda total
- **THEN** the system marks the Comanda as paid or closed according to the order lifecycle
- **AND** writes payment and order audit events
- **AND** creates cash movements for cash-affecting payment methods.

#### Scenario: Completion fails during side effect persistence

- **WHEN** payment persistence succeeds but a required Comanda, cash or audit write fails in the same operation
- **THEN** the whole operation is rolled back or reported as not completed
- **AND** no partial paid state is exposed as successful.