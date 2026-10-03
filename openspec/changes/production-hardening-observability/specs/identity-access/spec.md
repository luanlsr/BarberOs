## ADDED Requirements

### Requirement: Production tenant isolation audit

The system SHALL maintain production-readiness evidence that authenticated tenant-scoped modules reject cross-tenant reads and writes through server-side authorization and database isolation.

#### Scenario: Tenant isolation matrix

- **WHEN** production readiness is evaluated
- **THEN** the system has a module-by-module tenant isolation matrix covering reads, writes, critical side effects and the associated automated or documented validation

#### Scenario: Cross-tenant access denied

- **WHEN** Tenant B attempts to read or mutate a resource owned by Tenant A in a covered module
- **THEN** the operation is rejected with 403 or 404 semantics and no protected Tenant A payload is returned or modified

### Requirement: Sensitive access rate limiting

The system SHALL apply or explicitly document rate-limit controls for sensitive access paths including auth, AI, public booking, WhatsApp/campaigns, search, webhooks and platform support operations.

#### Scenario: Sensitive endpoint configured

- **WHEN** a sensitive endpoint or operation is reviewed for production readiness
- **THEN** it has a tenant, user, IP, idempotency or provider-aware rate-limit strategy appropriate to its abuse risk

#### Scenario: Rate limit exceeded

- **WHEN** a caller exceeds the configured limit for a sensitive operation
- **THEN** the system rejects or delays the operation without executing protected side effects and returns a stable error shape where applicable
