## Purpose

Define commission rules, accruals, payouts and professional wallet visibility so production and repasses remain reproducible even when rules change later.

## ADDED Requirements

### Requirement: Commission Rules

The system SHALL let authorized actors configure tenant-scoped commission rules by professional, service, product or default scope with percentage or fixed value calculation, effective dates and active status.

#### Scenario: Commission rule is created

- **WHEN** an authorized actor creates a commission rule for a professional or item scope
- **THEN** the system stores the rule with tenant and branch applicability
- **AND** the rule is used only for payments whose source items match its effective scope.

#### Scenario: Actor lacks commission permission

- **WHEN** an actor without `commission.manage` attempts to create or modify a commission rule
- **THEN** the system denies the operation without changing commission configuration.

### Requirement: Commission Accrual Snapshots

The system SHALL create commission accruals from paid Comanda items using the commission rule snapshot active at the time of accrual.

#### Scenario: Paid service item accrues commission

- **WHEN** a paid Comanda contains an item eligible for commission
- **THEN** the system creates a commission accrual for the responsible professional
- **AND** stores the applied rule type, rate or fixed amount, base amount, calculated amount and source item reference.

#### Scenario: Rule changes after accrual

- **WHEN** a commission rule changes after an accrual has been created
- **THEN** historical accruals keep their original snapshot values
- **AND** payout totals for closed periods do not silently change.

#### Scenario: Refund corrects commission liability

- **WHEN** a paid payment is refunded or corrected for an item with accrued commission
- **THEN** the system records a commission reversal or adjustment linked to the original accrual
- **AND** preserves the original accrual for audit.

### Requirement: Payout Lifecycle

The system SHALL support closing, approving and paying professional payouts from open commission accruals without deleting the underlying accrual history.

#### Scenario: Payout is closed for a period

- **WHEN** an authorized actor closes a payout period for a professional
- **THEN** the system groups eligible open accruals into a payout
- **AND** stores the total, period, professional, branch scope and included accrual references.

#### Scenario: Payout is paid

- **WHEN** an authorized actor marks a payout as paid
- **THEN** the system records payout payment metadata and a financial entry
- **AND** marks included accruals as settled without changing their snapshot amounts.

#### Scenario: Payout correction

- **WHEN** a paid payout needs correction
- **THEN** the system records an adjustment or reversal instead of mutating paid payout history.

### Requirement: Professional Wallet

The system SHALL expose a professional wallet view with own production, commission accruals, payouts paid and expected balance without revealing tenant-wide finance data.

#### Scenario: Professional views own wallet

- **WHEN** a professional opens Minha carteira
- **THEN** the system shows only that professional's production, open commission, paid payouts and expected balance for the allowed tenant and branch scope.

#### Scenario: Professional requests another wallet

- **WHEN** a professional without elevated permission requests another professional's wallet
- **THEN** the system denies access without exposing the other professional's financial data.

### Requirement: Commission Authorization And Audit

The system SHALL enforce commission and payout permissions server-side and audit all rule, accrual adjustment and payout mutations.

#### Scenario: Commission mutation succeeds

- **WHEN** a commission rule, accrual adjustment or payout mutation succeeds
- **THEN** the system records actor, tenant, branch, professional, action, result, amount and timestamp in the audit trail.
