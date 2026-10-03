## Purpose

Estabelecer os criterios operacionais que permitem colocar o MVP do BarberOS em producao com validacao, observabilidade, seguranca, deploy e resposta a incidentes proporcionais ao risco multi-tenant.

## ADDED Requirements

### Requirement: Production validation gate

The system SHALL provide a single production validation gate that confirms formatting, linting, typechecking, unit and integration tests, migration validators, client-secret checks, E2E readiness and production builds before a release is considered ready.

#### Scenario: Validation gate passes

- **WHEN** the production readiness validation command is executed on a release candidate
- **THEN** it verifies format, lint, typecheck, tests, build, OpenSpec validation, migration validators and client secret checks without failures

#### Scenario: Validation gate fails

- **WHEN** any required validation step fails
- **THEN** the release candidate is considered not ready and the failure identifies the failing step

### Requirement: Critical flow readiness coverage

The system SHALL validate the MVP critical flows with automated or explicitly documented readiness checks covering agenda to payment and commission, walk-in to stock and finance, and WhatsApp or AI to appointment.

#### Scenario: Agenda to payment flow

- **WHEN** release readiness is evaluated
- **THEN** the login, agenda, check-in, Comanda, payment and commission path has passing automated coverage or a documented manual readiness check

#### Scenario: Walk-in product sale flow

- **WHEN** release readiness is evaluated
- **THEN** the walk-in, new Comanda, service/product items, payment, stock movement and finance path has passing automated coverage or a documented manual readiness check

#### Scenario: WhatsApp or AI booking flow

- **WHEN** release readiness is evaluated
- **THEN** the WhatsApp or AI, availability and appointment path has passing automated coverage or a documented manual readiness check

### Requirement: Structured observability

The system SHALL emit structured observability signals with service name, environment, request or correlation id, tenant context when safe, event name, result and sanitized error details for web, worker and AI operations.

#### Scenario: Request id propagation

- **WHEN** a protected request triggers downstream work or an asynchronous job
- **THEN** the request id or correlation id is preserved across web, worker, AI and audit/log records where technically available

#### Scenario: Sensitive metadata redaction

- **WHEN** logs, metrics or audit records include metadata from auth, payments, WhatsApp, AI or support operations
- **THEN** secrets, tokens, payment credentials, private message bodies and raw provider payloads are omitted or redacted

#### Scenario: Operational failure observable

- **WHEN** a worker job, webhook, AI tool call or billing operation fails
- **THEN** operators can identify the failing module, tenant-safe context, request or correlation id, sanitized error code and retryability where applicable

### Requirement: Production deployment readiness

The system SHALL document and validate the required production environments for Vercel web, Railway worker, Railway AI, Supabase and Redis without exposing secrets to client bundles or repository files.

#### Scenario: Environment checklist complete

- **WHEN** production deployment readiness is reviewed
- **THEN** required environment variables, service targets, health checks and secret ownership are documented for web, worker, AI, Supabase and Redis

#### Scenario: Client secret boundary checked

- **WHEN** the web production build and client-secret validation run
- **THEN** service role keys, provider secrets and administrative credentials are not present in browser-delivered bundles or public configuration

### Requirement: Operational runbooks

The system SHALL provide runbooks for high-risk production incidents including payment failure, WhatsApp/provider failure, worker failure, tenant isolation incident, database restore and platform support access.

#### Scenario: Incident runbook available

- **WHEN** an operator encounters a covered incident class
- **THEN** the runbook explains detection signals, immediate containment, investigation steps, rollback or retry guidance, customer impact notes and audit requirements

#### Scenario: Tenant isolation incident

- **WHEN** a suspected tenant isolation breach is investigated
- **THEN** the runbook prioritizes containment, access revocation, audit preservation, affected-tenant analysis and post-incident validation before normal operation resumes
