## ADDED Requirements

### Requirement: Product Revenue Attribution

The system SHALL classify paid product items as product revenue and retain source metadata that can support product margin and stock reconciliation views.

#### Scenario: Paid product creates product revenue

- **WHEN** a Comanda payment completes for one or more product items
- **THEN** the system records product revenue financial entries using payment, Comanda and source item references
- **AND** keeps the entries visible only inside the same tenant and authorized branch scope.

#### Scenario: Finance summary includes product revenue

- **WHEN** an authorized actor opens a finance summary for a period with paid product sales
- **THEN** the system includes product revenue in period totals
- **AND** can distinguish product revenue from service revenue for drill-down or future margin reporting.