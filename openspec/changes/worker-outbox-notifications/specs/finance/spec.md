## ADDED Requirements

### Requirement: Asynchronous Finance Recalculation Jobs

The system SHALL support async finance recalculation and reconciliation jobs for committed business events without mutating paid or immutable records destructively.

#### Scenario: Recalculation job is created

- **WHEN** a payment, payout, expense, commission or inventory event requires derived finance summaries to refresh
- **THEN** the system can enqueue a finance recalculation job with tenant, branch, period and source references.

#### Scenario: Recalculation job runs

- **WHEN** the worker processes a finance recalculation job
- **THEN** it recomputes derived summaries or projections from immutable source records.

#### Scenario: Recalculation fails

- **WHEN** the recalculation job fails
- **THEN** source payments, expenses, payouts, commissions and financial entries remain unchanged
- **AND** the job remains retryable or visible as failed.