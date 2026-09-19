## Purpose

Define the operational finance ledger, expenses and management summaries that let BarberOS show revenue, cost, result and cash-flow views from auditable business events.

## ADDED Requirements

### Requirement: Financial Entry Ledger

The system SHALL store financial entries as immutable tenant-scoped and branch-scoped records with direction, type, amount, competence date, cash date, source reference and actor metadata when applicable.

#### Scenario: Paid Comanda creates revenue entry

- **WHEN** a Comanda payment is completed for a tenant branch
- **THEN** the system records financial revenue entries using the payment and Comanda source references
- **AND** the entries are visible only inside the same tenant and authorized branch scope.

#### Scenario: Refund creates reversal entry

- **WHEN** an authorized refund or correction reverses a paid payment amount
- **THEN** the system records a reversal financial entry linked to the original payment source
- **AND** preserves the original revenue entry instead of overwriting it.

#### Scenario: Cross-tenant financial access is denied

- **WHEN** a Tenant B actor requests a Tenant A financial entry or summary
- **THEN** the system returns not found or forbidden without leaking Tenant A financial data.

### Requirement: Expenses

The system SHALL allow authorized actors to record tenant-scoped expenses with category, description, amount, competence date, due date, cash date, status, branch scope, payment method and optional document metadata.

#### Scenario: Manual expense is created

- **WHEN** an authorized finance actor records a manual expense
- **THEN** the system stores the expense with tenant and branch scope
- **AND** creates or schedules the corresponding financial entry according to the expense status and cash date.

#### Scenario: Expense is paid

- **WHEN** an authorized actor marks an open expense as paid
- **THEN** the system records an expense financial entry
- **AND** the paid amount is not later changed destructively.

#### Scenario: Recurring expense creates next competence

- **WHEN** a recurring expense template reaches its next due period
- **THEN** the system creates the next expense instance with the configured category, amount, branch and recurrence metadata.

### Requirement: Finance Summary

The system SHALL expose period-scoped and branch-scoped finance summaries for revenue, expenses, estimated result, pending commissions, paid payouts and cash-flow totals.

#### Scenario: Owner views monthly summary

- **WHEN** an authorized owner or finance actor opens Financeiro for a selected period
- **THEN** the system shows revenue, expenses, result, commission liability and payout totals derived from financial entries and commission records.

#### Scenario: Branch-scoped manager views summary

- **WHEN** a manager scoped to Branch A opens a finance summary
- **THEN** the totals include only Branch A entries
- **AND** entries from other branches are excluded.

#### Scenario: Empty period

- **WHEN** a period has no financial entries or expenses
- **THEN** the system returns an empty finance state with zero totals and safe creation actions based on permissions.

### Requirement: Finance Authorization And Audit

The system SHALL enforce finance permissions server-side and audit financial mutations including expenses, corrections and sensitive status changes.

#### Scenario: Actor lacks finance write permission

- **WHEN** an actor without `finance.write` attempts to create, pay, cancel or correct an expense or financial entry
- **THEN** the system denies the operation without changing finance state.

#### Scenario: Financial mutation succeeds

- **WHEN** a financial mutation succeeds
- **THEN** the system records actor, tenant, branch, action, result, amount, source and timestamp in the audit trail.
