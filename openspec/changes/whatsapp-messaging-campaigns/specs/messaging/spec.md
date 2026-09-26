## Purpose

Define WhatsApp-first messaging connections, inbound/outbound messages, conversations, provider events and consent records so BarberOS can treat customer communication as a tenant-scoped operational capability instead of an external manual process.

## ADDED Requirements

### Requirement: Messaging provider connections

The system SHALL allow authorized operators to configure and manage tenant-scoped and branch-scoped WhatsApp messaging connections without exposing provider credentials to the browser.

#### Scenario: Active branch connection is selected

- **WHEN** a branch has an active WhatsApp connection and an authorized workflow requests a WhatsApp send for that branch
- **THEN** the system uses the branch connection for delivery
- **AND** the delivery record stores only non-secret provider metadata.

#### Scenario: Missing or inactive connection prevents delivery

- **WHEN** a WhatsApp send is requested for a tenant or branch without an active messaging connection
- **THEN** the system does not call the provider
- **AND** records a skipped or failed delivery outcome that operators can inspect.

#### Scenario: Unauthorized operator cannot manage connections

- **WHEN** a user without messaging management permission attempts to create, update or deactivate a connection
- **THEN** the system rejects the action
- **AND** no credential or connection secret is returned.

### Requirement: Inbound webhook ingestion

The system SHALL accept WhatsApp provider webhooks only when signature, timestamp and provider configuration checks pass, persist raw events idempotently and enqueue asynchronous processing through the worker.

#### Scenario: Valid webhook is acknowledged quickly

- **WHEN** the provider sends a webhook with a valid signature, current timestamp and unseen provider event id
- **THEN** the system stores the raw event with tenant/provider context
- **AND** enqueues processing without performing long-running work in the request.

#### Scenario: Invalid webhook is rejected

- **WHEN** the provider sends a webhook with an invalid signature, stale timestamp or unknown connection
- **THEN** the system rejects the webhook
- **AND** does not create messages, conversations or delivery status events from it.

#### Scenario: Duplicate webhook is idempotent

- **WHEN** the provider retries a webhook event that was already stored
- **THEN** the system acknowledges the retry according to provider expectations
- **AND** does not duplicate conversations, messages or delivery status changes.

### Requirement: Conversations and messages

The system SHALL persist tenant-scoped conversations and messages with direction, channel, customer link when known, provider ids, delivery state and sanitized payload metadata.

#### Scenario: Inbound customer message updates conversation

- **WHEN** an inbound WhatsApp text message is processed for a known customer phone number
- **THEN** the system creates or updates the customer's conversation
- **AND** stores the inbound message with provider id, received timestamp and tenant/branch scope.

#### Scenario: Unknown inbound sender is retained safely

- **WHEN** an inbound message arrives from a phone number that is not linked to a customer
- **THEN** the system stores the message in an unresolved conversation
- **AND** allows an authorized operator to link it later without changing tenant scope.

#### Scenario: Cross-tenant reads are blocked

- **WHEN** a user requests messages or conversations outside their tenant or branch scope
- **THEN** the system returns no cross-tenant data
- **AND** records the authorization denial when required by audit policy.

### Requirement: Consent and opt-out records

The system SHALL record WhatsApp consent, marketing consent and opt-out changes from operator actions, imported customer preferences and inbound opt-out keywords.

#### Scenario: Inbound opt-out keyword disables marketing

- **WHEN** an inbound message contains a configured opt-out keyword such as "SAIR" or "STOP"
- **THEN** the system records an opt-out event for that customer or phone number
- **AND** future marketing sends to that destination are blocked.

#### Scenario: Transactional consent is evaluated separately

- **WHEN** a transactional appointment message is requested
- **THEN** the system evaluates WhatsApp contact eligibility separately from marketing consent
- **AND** records the reason when delivery is not allowed.

#### Scenario: Consent changes are auditable

- **WHEN** an operator changes a customer's WhatsApp or marketing consent state
- **THEN** the system stores the actor, timestamp, source and previous/new values
- **AND** applies the new state to subsequent delivery eligibility checks.