## ADDED Requirements

### Requirement: Payment Outbox Events

The system SHALL enqueue async side effects for payment completion and correction through the transactional outbox after the core payment, order, cash, finance, commission and inventory transaction is safely committed.

#### Scenario: Payment completion emits async events

- **WHEN** a payment completion operation commits successfully
- **THEN** the system creates outbox events for downstream async work such as receipts, notifications, reconciliation or analytics
- **AND** payment success does not depend on an external provider being available.

#### Scenario: Payment correction emits async events

- **WHEN** a refund or correction commits successfully
- **THEN** the system creates outbox events needed for downstream recalculation, notifications or audit integrations.

#### Scenario: Async event processing fails

- **WHEN** a payment-related outbox event fails in the worker
- **THEN** the original payment remains committed
- **AND** the failed async side effect remains retryable and visible to authorized operators.