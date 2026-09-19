## Purpose

Define the reliable async execution layer for BarberOS, covering transactional outbox, worker processing, jobs, retries and operational observability for side effects that must not block core transactions.

## ADDED Requirements

### Requirement: Transactional Outbox Events

The system SHALL persist tenant-scoped outbox events in the same committed transaction as the domain state that requires an asynchronous side effect.

#### Scenario: Domain transaction emits outbox event

- **WHEN** a critical business operation commits state that requires an async side effect
- **THEN** the system persists an outbox event with tenant, optional branch, event type, source reference, payload, idempotency key, status and correlation id
- **AND** the domain transaction can succeed even when the worker is not running.

#### Scenario: Domain transaction rolls back

- **WHEN** the business operation fails before commit
- **THEN** no corresponding outbox event is visible for processing.

#### Scenario: Duplicate outbox emission is retried

- **WHEN** the same critical operation is retried with the same idempotency key
- **THEN** the system does not create duplicate outbox events for the same source side effect.

### Requirement: Worker Job Lifecycle

The system SHALL process outbox events and scheduled jobs through a persistent worker with observable lifecycle states.

#### Scenario: Worker claims pending work

- **WHEN** the worker is running and pending work is available
- **THEN** it claims work without allowing two concurrent workers to process the same job successfully.

#### Scenario: Job succeeds

- **WHEN** a worker completes a job side effect
- **THEN** the system records the job as completed with timestamps, attempt count and correlation id.

#### Scenario: Job fails transiently

- **WHEN** a retryable job fails
- **THEN** the system records the failure, increments attempt count and schedules a retry using backoff.

#### Scenario: Job exhausts retries

- **WHEN** a job reaches its retry limit
- **THEN** the system moves it to a dead-letter or failed state with sanitized error metadata for operational review.

### Requirement: Worker Job Contracts

The system SHALL define versioned job and event contracts for appointment reminders, post-service follow-ups, finance recalculation, stock alerts, expired record cleanup and future provider dispatch.

#### Scenario: Minimal payload job is created

- **WHEN** a scheduler or outbox producer creates a job
- **THEN** the payload includes stable identifiers and context metadata instead of duplicating sensitive customer or tenant data unnecessarily.

#### Scenario: Unknown job version is encountered

- **WHEN** the worker receives an unsupported job type or schema version
- **THEN** it rejects the job safely, records a stable error and does not perform side effects.

### Requirement: Redis Backed Processing Primitives

The system SHALL use queue, lock, retry and rate-limit primitives in a way that can run locally and in the target deployed worker environment.

#### Scenario: Lock prevents duplicate processing

- **WHEN** two worker processes attempt to run the same lock-sensitive job
- **THEN** only one process obtains the lock and performs the side effect.

#### Scenario: Rate limit is reached

- **WHEN** a job category reaches its configured rate limit
- **THEN** the worker delays or reschedules execution without marking the job successful.

### Requirement: Worker Observability

The system SHALL record structured worker and job telemetry with job id, event id, tenant id, branch id when applicable, correlation id, attempt count, status and sanitized error details.

#### Scenario: Job fails

- **WHEN** a job attempt fails
- **THEN** logs and persisted metadata include enough context to troubleshoot without exposing secrets, payment data or sensitive message content.

#### Scenario: Operator inspects failure

- **WHEN** an authorized operator views failed jobs
- **THEN** the system shows status, type, retry count, last error summary, tenant or branch scope and next action when available.