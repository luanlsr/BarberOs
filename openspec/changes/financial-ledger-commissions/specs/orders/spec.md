## ADDED Requirements

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
