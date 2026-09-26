## Purpose

Define campaign authoring, approval, audience selection, scheduling, dispatch and metrics so BarberOS can run opt-out-safe customer reactivation and marketing workflows through the worker and messaging layer.

## ADDED Requirements

### Requirement: Campaign draft and approval lifecycle

The system SHALL manage campaign lifecycle states for draft, review, approval, scheduling, sending, completion, partial failure and cancellation.

#### Scenario: Campaign requires approval before dispatch

- **WHEN** an operator creates a campaign draft
- **THEN** the system keeps it in a non-sendable draft or review state until an authorized approver approves it
- **AND** records approval actor and timestamp.

#### Scenario: Approved campaign can be scheduled

- **WHEN** an approved campaign is scheduled for a future time
- **THEN** the system records the schedule using tenant timezone rules
- **AND** enqueues dispatch only when the schedule becomes due.

#### Scenario: Cancellation prevents future dispatch

- **WHEN** an authorized operator cancels a draft, approved or scheduled campaign before dispatch begins
- **THEN** the system marks the campaign cancelled
- **AND** does not create new campaign delivery jobs for it.

### Requirement: Campaign audience and consent filtering

The system SHALL compute campaign audiences from tenant-scoped customer data while enforcing branch scope, WhatsApp reachability, marketing consent and opt-out rules before any send is created.

#### Scenario: Audience preview excludes ineligible customers

- **WHEN** an operator previews a campaign audience
- **THEN** the system returns eligible, excluded and unknown-contact counts
- **AND** includes exclusion reasons without exposing customers outside the operator's scope.

#### Scenario: Dispatch uses frozen audience snapshot

- **WHEN** a campaign is approved or scheduled for dispatch
- **THEN** the system stores an audience snapshot with customer ids, destination hashes and eligibility reasons
- **AND** sends only to recipients eligible at dispatch time.

#### Scenario: Opted-out recipient is skipped

- **WHEN** a customer opts out after audience preview but before dispatch
- **THEN** the dispatch skips that recipient
- **AND** records a skipped outcome instead of sending the message.

### Requirement: Campaign dispatch through worker

The system SHALL dispatch campaigns asynchronously through worker jobs, outbox events and provider rate-limit controls.

#### Scenario: Campaign dispatch creates delivery work

- **WHEN** a campaign enters sending state
- **THEN** the worker creates idempotent delivery work for each eligible audience recipient
- **AND** records per-recipient delivery attempts linked to the campaign run.

#### Scenario: Provider failure does not stop all recipients

- **WHEN** the provider returns a retryable failure for one recipient
- **THEN** the system retries that delivery according to configured retry policy
- **AND** continues processing other recipients within provider rate limits.

#### Scenario: Permanent failures are visible

- **WHEN** the provider returns a permanent failure for a recipient
- **THEN** the system marks that recipient delivery failed
- **AND** campaign status reflects partial failure when other recipients still succeed.

### Requirement: Campaign metrics and outcomes

The system SHALL expose campaign metrics for audience size, sent, delivered, failed, skipped, opt-outs and replies using tenant-scoped delivery and webhook data.

#### Scenario: Operator views campaign results

- **WHEN** an authorized operator opens a completed or sending campaign
- **THEN** the system shows current delivery totals and failure/skipped counts
- **AND** hides data outside the operator's branch scope.

#### Scenario: Replies are attributed to campaign

- **WHEN** an inbound customer reply can be matched to a campaign message
- **THEN** the system associates the reply with the campaign result
- **AND** updates response metrics without changing the original delivery record.

#### Scenario: Metrics tolerate delayed provider events

- **WHEN** delivery status webhooks arrive after campaign dispatch completion
- **THEN** the system updates metrics idempotently
- **AND** preserves a history of provider status events.