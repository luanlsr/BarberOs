## ADDED Requirements

### Requirement: Appointment Reminder Jobs

The system SHALL create idempotent reminder jobs for eligible appointment lifecycle events without making scheduling operations depend on external notification delivery.

#### Scenario: Appointment is confirmed

- **WHEN** an appointment is created or confirmed with reminder eligibility
- **THEN** the system enqueues or schedules a reminder job scoped to the appointment tenant and branch.

#### Scenario: Appointment is cancelled

- **WHEN** an appointment is cancelled before a pending reminder runs
- **THEN** the reminder job is cancelled, skipped or rendered no-op by checking current appointment state before delivery.

#### Scenario: Reminder job is retried

- **WHEN** a reminder job is retried
- **THEN** the worker uses current appointment state and idempotency to avoid duplicate or stale reminders.