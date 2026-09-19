# cash-register Specification

## Purpose
Define how BarberOS opens, monitors and closes branch cash register sessions, including cash movements, expected balances, divergences, authorization and immutable operational history.

## Requirements

### Requirement: Cash Register Sessions

The system SHALL maintain at most one open cash register session per tenant branch for operational cash handling.

#### Scenario: Open cash session

- **WHEN** an authorized actor opens cash for a branch with an opening balance
- **THEN** the system creates an open cash register session for that tenant branch
- **AND** records the opening balance as the first cash movement
- **AND** exposes the session status to authorized users in that branch.

#### Scenario: Open duplicate cash session

- **WHEN** a branch already has an open cash session
- **THEN** the system rejects another open request for the same tenant branch
- **AND** returns the existing open session or a stable conflict error.

#### Scenario: Out-of-scope cash session access

- **WHEN** an actor scoped to Branch A requests a cash session from Branch B
- **THEN** the system denies access without exposing Branch B cash data.

### Requirement: Cash Movements

The system SHALL record cash movements as immutable tenant-scoped and branch-scoped entries for opening balance, sales, refunds, withdrawals, cash-in, expenses and adjustments.

#### Scenario: Record withdrawal

- **WHEN** an authorized actor records a sangria with amount and reason
- **THEN** the system creates a withdrawal cash movement in the open session
- **AND** the expected cash balance decreases by that amount.

#### Scenario: Record cash-in

- **WHEN** an authorized actor records a reforco with amount and reason
- **THEN** the system creates a cash-in movement in the open session
- **AND** the expected cash balance increases by that amount.

#### Scenario: Missing open session

- **WHEN** a cash-affecting movement is requested for a branch without an open session
- **THEN** the system rejects the operation with a stable error
- **AND** does not create orphan cash movements.

### Requirement: Cash Closing

The system SHALL close cash sessions by comparing expected balances from immutable movements with actual balances informed by an authorized actor.

#### Scenario: Close balanced session

- **WHEN** an authorized actor closes an open session and the informed actual cash balance equals the expected balance
- **THEN** the system closes the session with zero difference
- **AND** records closed_by, closed_at and closing audit data.

#### Scenario: Close session with divergence

- **WHEN** the informed actual cash balance differs from expected cash balance
- **THEN** the system records the difference and requires a reason or note for the divergence
- **AND** preserves the underlying movements that produced the expected value.

#### Scenario: Mutate closed session

- **WHEN** an actor attempts to add operational movements to a closed cash session
- **THEN** the system rejects the operation without changing the closed session.

### Requirement: Cash Register Authorization And Audit

The system SHALL enforce `cash.open`, `cash.withdraw` and `cash.close` permissions server-side and audit every cash session and movement mutation.

#### Scenario: Actor lacks cash permission

- **WHEN** an actor without the required cash permission attempts to open, withdraw, add cash or close cash
- **THEN** the system denies the operation without changing cash state.

#### Scenario: Cash mutation succeeds

- **WHEN** an authorized cash mutation succeeds
- **THEN** the system records actor, tenant, branch, action, result, amount and timestamp in the audit trail.

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
