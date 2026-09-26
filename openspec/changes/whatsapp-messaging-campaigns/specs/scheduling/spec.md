## ADDED Requirements

### Requirement: Appointment transactional messaging

The system SHALL create transactional notification intents for appointment confirmations, reminders, cancellations and post-service follow-ups when WhatsApp messaging is configured and the appointment/customer is eligible.

#### Scenario: Confirmed appointment schedules customer messages

- **WHEN** an appointment is created or moved to confirmed status for a customer with WhatsApp eligibility
- **THEN** the system creates notification intents for the configured confirmation and reminder messages
- **AND** those intents reference the appointment, tenant and branch scope.

#### Scenario: Cancellation prevents future reminder send

- **WHEN** an appointment is cancelled before a scheduled reminder is delivered
- **THEN** the system cancels or marks the pending reminder intent as no longer sendable
- **AND** creates a cancellation notification intent when the customer remains eligible.

#### Scenario: Messaging failure does not roll back appointment

- **WHEN** appointment creation, confirmation or cancellation succeeds but WhatsApp routing is unavailable
- **THEN** the appointment change remains committed
- **AND** the system records the messaging skip or failure for operator visibility.

#### Scenario: Post-service follow-up is created after completion

- **WHEN** an appointment reaches completed status
- **THEN** the system creates a post-service follow-up notification intent when configured
- **AND** the worker rechecks customer eligibility before delivery.