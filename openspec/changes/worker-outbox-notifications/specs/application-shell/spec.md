## ADDED Requirements

### Requirement: Worker Failure Visibility

The system SHALL expose worker, outbox and notification failure states only to authorized operators within their tenant and branch scope.

#### Scenario: Authorized operator views failed jobs

- **WHEN** an owner, manager or platform-authorized operator opens operational failure status
- **THEN** the system shows failed job or notification summaries with type, status, retry count and sanitized last error.

#### Scenario: Unauthorized actor attempts access

- **WHEN** an actor without operational support permission or scope attempts to view worker failures
- **THEN** the system denies access without exposing job payloads, notification recipients or tenant data.

#### Scenario: No failures exist

- **WHEN** no failed jobs or notification attempts exist for the actor scope
- **THEN** the system shows an empty healthy state rather than a technical error.