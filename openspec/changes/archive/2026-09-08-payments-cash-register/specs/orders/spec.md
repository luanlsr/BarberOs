## ADDED Requirements

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