## ADDED Requirements

### Requirement: Order Lifecycle Outbox Events

The system SHALL emit outbox events for committed Comanda lifecycle changes that require asynchronous follow-up without blocking the operational flow.

#### Scenario: Comanda is opened

- **WHEN** a Comanda is opened from check-in or walk-in
- **THEN** the system may enqueue async jobs for operational analytics, CRM recalculation or follow-up preparation after the order transaction commits.

#### Scenario: Comanda is paid

- **WHEN** a Comanda reaches paid or closed state
- **THEN** the system may enqueue post-service follow-up and summary jobs with source identifiers and tenant scope.

#### Scenario: Worker is offline

- **WHEN** the worker is offline during a Comanda lifecycle operation
- **THEN** the Comanda operation remains committed and the outbox event remains pending for later processing.