## 1. Contracts And Permissions

- [x] 1.1 Extend `packages/contracts` with Core Operations permissions, entities, command schemas, query schemas, appointment statuses and stable error codes; verify `npm run typecheck` and contract unit tests pass.
- [x] 1.2 Update permission defaults/seed data for owner, manager, receptionist and professional roles with Core Operations permissions and `core.operations` entitlement; verify seed contains expected permission assignments.
- [x] 1.3 Add contract tests for invalid service price/duration, invalid appointment payloads and branch-scoped authorization requirements; verify targeted Vitest tests pass.

## 2. Database And Migration

- [x] 2.1 Create a versioned Supabase migration for professionals, services, service-professionals, customers, schedules, schedule blocks, appointments, appointment services and appointment status history; verify migration file is present and ordered after foundation.
- [x] 2.2 Add tenant/branch/professional/customer indexes, RLS policies and defensive tenant isolation helpers for all new operational tables; verify migration validation script checks each required table has RLS enabled.
- [x] 2.3 Add database-level appointment conflict prevention for active statuses using temporal ranges per tenant, branch and professional; verify migration validation checks the conflict constraint exists.
- [x] 2.4 Extend development seed with realistic professionals, services, customers, schedules and appointments for the default tenant; verify local agenda fixtures can be queried by tenant and branch.

## 3. Domain And Application Services

- [x] 3.1 Create module folders for professionals, services, customers and scheduling with domain/application/infrastructure boundaries; verify imports do not make domain code depend on Next.js, React or Supabase SDK.
- [x] 3.2 Implement professional application services for list/create/update/archive with `RequestContext`, permissions, `core.operations` entitlement and branch scope checks; verify unit tests cover allowed, missing permission and out-of-scope branch cases.
- [x] 3.3 Implement service application services for list/create/update/archive and service-professional assignment; verify tests cover invalid price/duration and archived service behavior.
- [x] 3.4 Implement customer application services for search/create/update/archive with tenant isolation and optional preferred professional validation; verify tests cover cross-tenant read/write denial.
- [x] 3.5 Implement scheduling services for working schedules and schedule blocks; verify tests cover block availability impact and overlap behavior with existing appointments.
- [x] 3.6 Implement availability calculation from schedules, blocks and active appointments using branch timezone; verify tests cover empty availability, filtered professional and unauthorized scope.
- [x] 3.7 Implement appointment create/reschedule/cancel/status history services with stable errors and database conflict mapping; verify tests cover concurrent conflict, valid reschedule, conflicting reschedule and invalid status transition.

## 4. API Routes

- [x] 4.1 Add `/api/v1/professionals` route handlers as thin adapters to professional services; verify API tests cover list/create/update/archive authorization behavior.
- [x] 4.2 Add `/api/v1/services` route handlers as thin adapters to service services; verify API tests cover validation and permission-denied responses.
- [x] 4.3 Add `/api/v1/customers` route handlers as thin adapters to customer services; verify API tests cover tenant isolation and search behavior.
- [x] 4.4 Add `/api/v1/schedules`, `/api/v1/schedule-blocks`, `/api/v1/availability` and `/api/v1/appointments` route handlers; verify API tests cover availability, create, conflict, reschedule and cancel responses.
- [x] 4.5 Ensure all new routes return the shared API error model with request id; verify tests assert stable error codes instead of message-only failures.

## 5. Operational UI

- [x] 5.1 Extend shell navigation and central `+` action with Agenda, Clientes, Equipe, Servicos and new appointment/customer actions filtered by permissions and entitlement; verify navigation tests pass.
- [x] 5.2 Build agenda data loading layer and responsive Agenda route with mobile day timeline, tablet columns and desktop grid; verify Playwright screenshots at 320px, 390px, 768px, 1024px, 1440px and 1920px show no overlap or horizontal page scroll.
- [x] 5.3 Build `AppointmentCard` and appointment detail surface with status, customer, professional, services, history and permission-filtered actions; verify component/unit tests cover visible information and denied actions.
- [x] 5.4 Build new appointment flow with quick customer creation, service/professional/date/time selection and conflict feedback; verify E2E can create an appointment and handles an occupied slot.
- [x] 5.5 Build initial Customers, Professionals and Services operational list/form screens with loading, empty, error, disabled, offline and permission-denied states; verify responsive and accessibility checks pass.

## 6. Quality Gates

- [x] 6.1 Add tenant isolation tests for professionals, services, customers, schedules and appointments; verify Tenant B cannot read or write Tenant A data.
- [ ] 6.2 Add appointment concurrency/conflict test that attempts overlapping creates for the same professional; verify only one appointment is persisted.
- [ ] 6.3 Add E2E flow for login -> agenda -> create operational prerequisites -> create appointment -> cancel appointment -> slot available; verify Playwright passes with one worker.
- [ ] 6.4 Run `npm run validate`, `npm run validate:foundation`, migration validation and `openspec validate core-operations-scheduling`; verify all checks pass before marking tasks complete.
