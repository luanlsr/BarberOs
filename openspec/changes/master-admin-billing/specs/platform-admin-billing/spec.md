## Purpose

Operar o BarberOS como SaaS multi-tenant, permitindo que a plataforma gerencie tenants, planos, assinaturas, limites, suporte e auditoria sem violar isolamento ou expor dados privados dos clientes.

## ADDED Requirements

### Requirement: Platform tenant overview

The system SHALL provide a Master Admin tenant overview with tenant status, branch count, user count, current plan, subscription status, open billing exposure, usage indicators and operational health without exposing tenant-private operational records by default.

#### Scenario: Platform master lists tenants

- **WHEN** a platform master opens the Master Admin tenant overview
- **THEN** the system returns platform-scoped tenant summaries with plan, subscription and health metadata

#### Scenario: Non-platform user requests tenant overview

- **WHEN** a tenant user without platform access requests the tenant overview
- **THEN** the system rejects the request without returning tenant summaries

#### Scenario: Tenant summary avoids private records

- **WHEN** the tenant overview includes billing or usage health
- **THEN** the system returns aggregate metadata and does not include customer, appointment, order, message body or financial transaction details

### Requirement: Tenant lifecycle control

The system SHALL allow authorized platform users to suspend, reactivate and mark tenants for restricted operation with a required reason, immutable audit entry and stable lifecycle status.

#### Scenario: Suspend tenant

- **WHEN** a platform master suspends a tenant with a reason
- **THEN** the tenant status changes to a suspended state and an audit event records actor, tenant, reason, previous status, new status and request id

#### Scenario: Reactivate tenant

- **WHEN** a platform master reactivates a suspended tenant with a reason
- **THEN** the tenant status returns to active or trialing according to subscription state and an audit event records the transition

#### Scenario: Missing lifecycle reason

- **WHEN** a platform lifecycle action is submitted without a reason
- **THEN** the system rejects the action and leaves tenant status unchanged

### Requirement: SaaS plan catalog

The system SHALL let platform users manage SaaS plans with code, name, description, price, billing interval, status, included entitlements, numeric limits and metadata needed by tenant authorization.

#### Scenario: Create active plan

- **WHEN** a platform master creates a plan with valid pricing, interval and entitlement definitions
- **THEN** the system persists the plan and makes it available for tenant subscription assignment

#### Scenario: Archive plan

- **WHEN** a platform master archives a plan
- **THEN** the plan is no longer available for new assignments while existing subscriptions keep their historical plan reference

#### Scenario: Duplicate plan code

- **WHEN** a platform master attempts to create or update a plan using an existing plan code
- **THEN** the system rejects the change with a stable validation error

### Requirement: Plan entitlement enforcement data

The system SHALL store plan entitlements and limits so application services can determine whether a tenant may use a feature, and what numeric limit applies.

#### Scenario: Tenant has entitlement through plan

- **WHEN** a tenant has an active subscription to a plan with an enabled entitlement
- **THEN** entitlement checks can resolve that entitlement and its configured limit for the tenant

#### Scenario: Tenant lacks entitlement through plan

- **WHEN** a tenant requests a feature absent or disabled in the active plan
- **THEN** the system denies access even if a user has a related role permission

#### Scenario: Tenant override is applied

- **WHEN** a platform master applies a tenant-specific entitlement override
- **THEN** entitlement checks resolve the override and audit the actor, reason and resulting state

### Requirement: Tenant subscription lifecycle

The system SHALL track tenant subscriptions with plan, provider, external reference, status, period dates, trial dates, cancellation state and audit metadata.

#### Scenario: Assign tenant subscription

- **WHEN** a platform master assigns a tenant to a plan or records a provider subscription
- **THEN** the system stores the subscription state and updates the tenant's effective plan metadata

#### Scenario: Subscription expires

- **WHEN** a subscription reaches an expired, cancelled, unpaid or past-due state
- **THEN** the tenant effective access becomes restricted according to the configured lifecycle policy

#### Scenario: Subscription history remains traceable

- **WHEN** a tenant changes plans
- **THEN** historical subscriptions and invoices remain traceable for audit and support

### Requirement: Billing invoice visibility

The system SHALL expose platform-scoped invoice summaries with tenant, subscription, provider, status, amount, due date, paid date and external reference while keeping payment provider secrets server-side.

#### Scenario: Platform master views invoices

- **WHEN** a platform master opens billing visibility
- **THEN** the system returns invoice summaries and totals grouped by status

#### Scenario: Tenant user views platform invoices

- **WHEN** a non-platform tenant user requests platform invoice data
- **THEN** the system rejects the request without returning cross-tenant billing data

#### Scenario: Provider secret boundary

- **WHEN** invoice data is rendered in the browser
- **THEN** no provider API key, webhook secret or service role credential is included

### Requirement: Support access governance

The system SHALL allow support-oriented platform actions only through explicit, audited scopes that state tenant, purpose, actor, expiration and allowed operation class.

#### Scenario: Support scope created

- **WHEN** a platform master grants support access for a tenant with purpose and expiration
- **THEN** the system records a support scope and emits an audit event

#### Scenario: Support scope expired

- **WHEN** a support user attempts to use an expired support scope
- **THEN** the system denies the action and records the denied attempt

#### Scenario: Silent private data access blocked

- **WHEN** support attempts to access tenant-private operational records without a valid support scope
- **THEN** the system denies access even if the user has platform membership

### Requirement: Platform audit console

The system SHALL provide a Master Admin audit console for platform actions including plan changes, subscription changes, tenant lifecycle changes, entitlement overrides, support scopes and denied sensitive actions.

#### Scenario: Platform audit query

- **WHEN** a platform master filters audit records by tenant, actor, action or date range
- **THEN** the system returns matching audit entries with actor, target, result, request id and timestamps

#### Scenario: Sensitive payloads are redacted

- **WHEN** audit entries include metadata from billing, support or provider operations
- **THEN** the system redacts secrets, payment credentials and private message content

### Requirement: Master Admin MVP UI

The system SHALL provide a responsive Master Admin console with tenant, users, plans, subscriptions, invoices, entitlements, support and audit views with loading, empty, error, permission denied and disabled states.

#### Scenario: Platform master opens console

- **WHEN** a platform master opens `/master`
- **THEN** the system renders platform KPIs and the available admin sections for the user's platform permissions

#### Scenario: Unauthorized user opens console

- **WHEN** a tenant user without platform access opens `/master`
- **THEN** the system renders a forbidden state or redirects without loading platform data

#### Scenario: Mobile platform console

- **WHEN** the Master Admin console is viewed on a small mobile viewport
- **THEN** the system presents the same core information and actions without horizontal overflow
