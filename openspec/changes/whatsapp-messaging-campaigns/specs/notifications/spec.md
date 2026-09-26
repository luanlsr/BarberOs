## Purpose

Define WhatsApp-capable notification routing and delivery state on top of the worker/outbox foundation so transactional and operational messages can use real provider delivery while staying auditable and consent-aware.

## ADDED Requirements

### Requirement: Notification channel and provider routing

The system SHALL route notification intents to WhatsApp when the tenant or branch has an active messaging connection, the notification type supports WhatsApp and delivery eligibility checks pass.

#### Scenario: WhatsApp-capable appointment reminder is routed to provider

- **WHEN** an appointment reminder notification becomes due for a customer with WhatsApp eligibility and an active branch connection
- **THEN** the worker creates a WhatsApp delivery attempt
- **AND** stores provider request metadata without exposing secrets.

#### Scenario: Unsupported channel is skipped safely

- **WHEN** a notification intent requests WhatsApp but no eligible connection or destination exists
- **THEN** the worker records a skipped or failed delivery attempt
- **AND** the originating business workflow remains committed.

#### Scenario: Development fallback is explicit

- **WHEN** the environment uses a local or noop notification provider
- **THEN** the system records local delivery attempts as non-provider sends
- **AND** does not pretend the message was delivered by WhatsApp.

### Requirement: Provider delivery attempts and status events

The system SHALL persist provider delivery attempts and idempotent status events with provider message ids, lifecycle state, timestamps and error details.

#### Scenario: Provider send returns message id

- **WHEN** the WhatsApp provider accepts an outbound message
- **THEN** the system stores the provider message id on the delivery attempt
- **AND** marks the attempt sent or queued according to provider response.

#### Scenario: Delivery status webhook updates attempt

- **WHEN** a provider status webhook references a known provider message id
- **THEN** the system stores the status event idempotently
- **AND** updates the latest delivery state without duplicating events.

#### Scenario: Unknown status event is retained

- **WHEN** a provider status webhook cannot be matched to an existing delivery attempt
- **THEN** the system stores the raw provider event for investigation
- **AND** does not attach it to another tenant's message.

### Requirement: Consent-aware notification delivery

The system SHALL evaluate notification category, customer reachability, WhatsApp consent and marketing opt-out state before creating provider sends.

#### Scenario: Transactional notification is allowed by transactional rules

- **WHEN** a confirmation, reminder or cancellation message is requested for an appointment
- **THEN** the system applies transactional WhatsApp eligibility rules
- **AND** records the eligibility decision with the delivery attempt.

#### Scenario: Marketing notification is blocked by opt-out

- **WHEN** a marketing or campaign notification is requested for a recipient that opted out
- **THEN** the system does not send the message
- **AND** records a blocked-by-consent outcome for campaign metrics.

#### Scenario: Eligibility is rechecked at send time

- **WHEN** consent or contact data changes after a notification intent was created but before worker delivery
- **THEN** the worker uses the current eligibility state
- **AND** records the updated reason if delivery is skipped.