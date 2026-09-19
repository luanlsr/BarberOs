## ADDED Requirements

### Requirement: Finance Cash Effects

The system SHALL reflect cash-paid expenses and cash-paid payouts as auditable cash movements in the open branch cash session when those operations affect physical cash.

#### Scenario: Cash expense is paid

- **WHEN** an authorized actor pays an expense using physical cash from an open branch cash session
- **THEN** the system records an expense cash movement linked to the expense source
- **AND** the expected cash balance decreases by the paid amount.

#### Scenario: Cash payout is paid

- **WHEN** an authorized actor pays a professional payout using physical cash from an open branch cash session
- **THEN** the system records a payout cash movement linked to the payout source
- **AND** the expected cash balance decreases by the payout amount.

#### Scenario: Missing open session for cash effect

- **WHEN** a cash-paid expense or payout is requested for a branch without an open cash session
- **THEN** the system rejects the operation with a stable error
- **AND** does not create orphan finance, payout or cash movement records.
