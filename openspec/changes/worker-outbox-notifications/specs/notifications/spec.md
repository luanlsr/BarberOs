## Purpose

Define provider-agnostic notification intents and delivery attempts so BarberOS can create reminders, follow-ups and operational messages before binding the product to WhatsApp or another provider.

## ADDED Requirements

### Requirement: Notification Intents

The system SHALL store tenant-scoped and branch-scoped notification intents for operational messages such as appointment reminders, post-service follow-ups, stock alerts and campaign-ready drafts.

#### Scenario: Reminder intent is created

- **WHEN** an appointment reminder job determines a message should be sent
- **THEN** the system creates a notification intent with tenant, branch, recipient reference, template key, source reference, channel preference and idempotency key.

#### Scenario: Duplicate notification intent is retried

- **WHEN** the same reminder or follow-up is generated again with the same idempotency key
- **THEN** the system returns or reuses the existing notification intent instead of creating a duplicate.

### Requirement: Delivery Attempts

The system SHALL track delivery attempts separately from notification intent creation so provider failures are retryable and auditable.

#### Scenario: Delivery succeeds

- **WHEN** a provider adapter reports successful dispatch
- **THEN** the system records the delivery attempt as sent and links provider metadata that is safe to store.

#### Scenario: Provider is unavailable

- **WHEN** the provider is unavailable or rate limited
- **THEN** the system records a retryable delivery failure without marking the source business operation as failed.

#### Scenario: Delivery permanently fails

- **WHEN** retries are exhausted or the provider rejects the message permanently
- **THEN** the system marks the delivery failed with a sanitized reason available to authorized operators.

### Requirement: Notification Authorization And Privacy

The system SHALL enforce tenant, branch and permission scope for notification visibility and SHALL avoid exposing sensitive message contents to unauthorized actors.

#### Scenario: Authorized actor views notification status

- **WHEN** an authorized actor opens notification or job failure status for their tenant and branch scope
- **THEN** the system shows delivery status and sanitized failure details for allowed records only.

#### Scenario: Cross-tenant notification access is denied

- **WHEN** a Tenant B actor requests Tenant A notification intent or delivery attempt
- **THEN** the system returns not found or forbidden without leaking Tenant A recipient or message data.