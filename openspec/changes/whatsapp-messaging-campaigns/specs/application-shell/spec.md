## ADDED Requirements

### Requirement: Messaging and campaign operation surfaces

The application shell SHALL expose messaging connection, campaign and delivery health navigation only to users with the required permissions and tenant entitlements.

#### Scenario: Authorized manager sees messaging operations

- **WHEN** an owner or manager with messaging and campaign permissions opens the application
- **THEN** the shell exposes the appropriate messaging, campaign and delivery status surfaces
- **AND** actions are constrained by the user's branch scope.

#### Scenario: Unauthorized user cannot access campaign surfaces

- **WHEN** a user without campaign permissions attempts to navigate directly to a campaign route
- **THEN** the application shows a permission denied state
- **AND** the server returns no campaign audience, recipient or delivery data.

#### Scenario: Responsive navigation preserves core operations

- **WHEN** messaging and campaign surfaces are available on mobile, tablet or desktop
- **THEN** the shell keeps Agenda, Check-in, Comanda and Pagamento reachable as primary operational flows
- **AND** places messaging/campaign actions without crowding the mobile bottom navigation.

### Requirement: Campaign and delivery state presentation

The application shell and feature screens SHALL present campaign, messaging connection and delivery health states for loading, empty, error, permission denied, offline, scheduled, sending, completed and partially failed conditions.

#### Scenario: Empty messaging setup is actionable

- **WHEN** an authorized operator opens messaging settings without an active connection
- **THEN** the UI shows an empty state with the next allowed setup action
- **AND** does not expose provider secret fields to unauthorized users.

#### Scenario: Campaign dispatch shows partial failure

- **WHEN** a campaign has a mix of sent, skipped and failed deliveries
- **THEN** the UI presents partial failure status with counts and recoverable actions
- **AND** avoids implying that all recipients were reached.

#### Scenario: Offline mode protects sends

- **WHEN** the client is offline while an operator edits or schedules a campaign
- **THEN** the UI prevents final send or schedule confirmation until connectivity returns
- **AND** preserves draft edits that can be safely stored locally or on the server.