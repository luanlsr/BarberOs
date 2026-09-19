## MODIFIED Requirements

### Requirement: Payment Completion Effects

The system SHALL complete payment atomically with Comanda closure, cash movement creation, financial ledger entry creation, commission accrual creation and audit records when the paid amount covers the Comanda total.

#### Scenario: Comanda becomes paid

- **WHEN** an authorized payment operation brings the paid total to the Comanda total
- **THEN** the system marks the Comanda as paid or closed according to the order lifecycle
- **AND** writes payment and order audit events
- **AND** creates cash movements for cash-affecting payment methods
- **AND** creates financial revenue entries for paid amounts
- **AND** creates commission accruals for eligible source items using historical snapshots.

#### Scenario: Completion fails during side effect persistence

- **WHEN** payment persistence succeeds but a required Comanda, cash, finance, commission or audit write fails in the same operation
- **THEN** the whole operation is rolled back or reported as not completed
- **AND** no partial paid, financial or commission state is exposed as successful.

#### Scenario: Refund updates finance and commission

- **WHEN** an authorized refund or correction is recorded for a paid payment
- **THEN** the system records financial reversal entries and commission reversal or adjustment records when applicable
- **AND** preserves the original payment, revenue and commission history.
