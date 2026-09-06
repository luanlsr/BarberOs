## Context

See `proposal.md` for motivation. The current foundation already provides monorepo structure, Supabase SSR auth, `RequestContext`, authorization helpers, audit helpers, responsive shell, navigation filtering and OpenSpec specs for `application-shell` and `identity-access`.

Core Operations is the first tenant-scoped product layer on top of foundation. It must introduce durable operational data without shortcutting tenant isolation, branch scope, permissions or database-level conflict protection.

## Goals / Non-Goals

**Goals:**

- Add tenant-scoped domain/application/infrastructure modules for professionals, services, customers and scheduling.
- Add versioned Supabase migration with RLS, indexes and appointment conflict prevention.
- Add shared contracts and stable error codes for directory and scheduling APIs.
- Add thin Next.js API route handlers under `/api/v1`.
- Add responsive UI for agenda and basic operational directory flows inside the existing shell.
- Cover tenant isolation, branch authorization, appointment conflicts and responsive/permission states with tests.

**Non-Goals:**

- Do not implement POS, orders, payments, commissions or stock movements in this change.
- Do not implement public booking, WhatsApp booking or Barber AI tools yet.
- Do not add drag-and-drop rescheduling in the first agenda experience.
- Do not make schedule/availability cache depend on Redis yet; compute from Postgres for MVP.
- Do not support custom roles UI; use existing permissions model and seed/catalog defaults.

## Decisions

### 1. Split directory and scheduling capabilities

Professionals, services and customers are reusable across CRM, POS and finance, while scheduling has distinct invariants around availability and conflict prevention. Keeping `operations-directory` separate from `scheduling` avoids making appointment logic the owner of customer/service/professional records.

Alternative considered: one broad `core-operations` capability. Rejected because it would blur independently testable behavior and make later POS/CRM specs harder to evolve.

### 2. Modular monolith modules in `apps/web/modules`

Implement application/domain/infrastructure boundaries in `apps/web/modules/{professionals,services,customers,scheduling}`. Domain code exposes pure policies and types, application services require `RequestContext`, and infrastructure owns Supabase/Postgres access.

Alternative considered: create shared `packages/domain` immediately. Deferred to avoid adding cross-package complexity before reuse pressure is real.

### 3. Database is source of truth for appointment conflicts

Use PostgreSQL range-based exclusion constraint for active appointment statuses per `tenant_id`, `branch_id` and `professional_id`. Application availability checks improve UX, but concurrent create/reschedule correctness comes from the database.

Alternative considered: application-only conflict checks. Rejected because simultaneous booking is a stated critical invariant.

### 4. Store appointment time in UTC with branch timezone context

Appointments store `start_at` and `end_at` as `timestamptz`; branches already carry timezone in foundation data. UI converts for display and date filters. Schedule templates store local day-of-week and local times scoped to the branch timezone.

Alternative considered: store appointment-local date/time only. Rejected because multi-branch timezone and future public/WhatsApp scheduling need unambiguous instants.

### 5. Soft archive operational directory records

Professionals, services and customers use `archived_at`/status for operational removal. Existing appointments retain references and snapshots where needed later; this change preserves references and blocks use in new appointments.

Alternative considered: hard delete unused records. Rejected because history and auditability matter from the first operational loop.

### 6. API routes remain adapters

Routes under `/api/v1/customers`, `/api/v1/professionals`, `/api/v1/services`, `/api/v1/schedules`, `/api/v1/schedule-blocks`, `/api/v1/availability` and `/api/v1/appointments` parse requests, resolve context, call application services and map errors to stable response codes.

Alternative considered: business logic in route handlers. Rejected by architecture rules and makes AI/worker Tool Gateway reuse harder later.

### 7. Agenda UI starts operational, not calendar-library heavy

Build a responsive agenda with mobile day timeline, tablet professional columns and desktop grid using local components and CSS layout. Defer drag-and-drop and heavyweight calendar dependencies until interaction requirements justify them.

Alternative considered: introduce a full calendar dependency now. Deferred to keep bundle size and UX control aligned with the mobile-first MVP.

## Data Model

New tables:

- `professionals`: tenant, branches, display/profile data, status, archived metadata.
- `services`: tenant, category/name/description, duration, price, estimated cost, status, archived metadata.
- `service_professionals`: allowed professionals per service and optional professional-specific price/duration extension point.
- `customers`: tenant, branch optional, identity/contact fields, consent fields, preferred professional, status/archival metadata.
- `professional_schedules`: tenant, branch, professional, weekday, local start/end, optional break metadata, active flag.
- `schedule_blocks`: tenant, branch, professional optional, start/end, type, reason, status.
- `appointments`: tenant, branch, customer, professional, start/end, status, source, notes, created/updated metadata.
- `appointment_services`: appointment, service, sequence, duration and price snapshot for scheduling display/future order creation.
- `appointment_status_history`: appointment, previous status, new status, actor, reason, timestamp.

Migration should enable RLS on every tenant-scoped table and include tenant/branch indexes used by list/search/filter endpoints. If PostgreSQL extensions are required for exclusion constraints, include them in the migration with idempotent guards.

## Permissions

Extend contracts and seed/default role permissions with:

- `professionals.read`
- `professionals.create`
- `professionals.update`
- `services.read`
- `services.create`
- `services.update`
- `schedules.read`
- `schedules.manage`

Existing appointment and customer permissions remain in use. All Core Operations endpoints require `core.operations` entitlement.

## API Shape

Contracts use Zod in `packages/contracts` and return stable API error codes:

- `CORE_VALIDATION_ERROR`
- `CORE_PERMISSION_DENIED`
- `CORE_BRANCH_SCOPE_DENIED`
- `CORE_ENTITLEMENT_DENIED`
- `CORE_NOT_FOUND`
- `APPOINTMENT_CONFLICT`
- `APPOINTMENT_INVALID_TRANSITION`

List endpoints must support tenant-scoped pagination/search filters without accepting client-supplied tenant as authority. Write endpoints may accept branch/professional/customer/service ids, but services validate them against `RequestContext`.

## UI Approach

Agenda becomes the primary operational screen:

- Mobile: day timeline, compact filter strip, appointment cards, empty slots/actions and full-screen/bottom-sheet creation flow.
- Tablet: 2-4 professional columns when width allows, with touch-friendly cards.
- Desktop: operational grid by time and professional, with side panel/drawer for appointment creation/detail.

Directory screens start as focused operational lists/forms:

- Customers: searchable responsive list and quick-create flow usable from agenda.
- Professionals: list with status and branch assignment.
- Services: list with duration, price, status and enabled professionals.

All routes use existing shell/session context and render permission-denied/empty/loading/error/offline states.

## Testing Strategy

- Unit tests for availability calculation, appointment lifecycle transitions, money/time validation and authorization helpers.
- Integration-style tests for tenant isolation and branch scope in repositories/application services.
- Migration validation for required tables, RLS, indexes and appointment conflict constraint.
- E2E coverage for login -> agenda -> create customer/service/professional prerequisites -> create appointment -> conflict feedback -> cancel/reopen availability.
- Responsive checks for agenda at 320px, 390px, 768px, 1024px, 1440px and 1920px.

## Risks / Trade-offs

- [Risk] Exclusion constraints can be tricky in Supabase/Postgres setup. -> Mitigation: validate migration locally with a dedicated script and add a concurrent conflict test.
- [Risk] Building agenda layout manually may miss advanced calendar interactions. -> Mitigation: keep first scope to day/grid creation and defer drag-and-drop until behavior is specified.
- [Risk] Directory records may need richer CRM/POS fields later. -> Mitigation: keep current fields MVP-focused and use additive migrations for future finance/CRM/stock needs.
- [Risk] Professional-specific pricing can complicate scheduling and POS. -> Mitigation: model service-professional association with extension points but only require base price/duration behavior in this change.

## Migration Plan

1. Add migration and contracts first; deploy is additive.
2. Add application services and APIs behind existing auth/context checks.
3. Add UI routes and navigation entries gated by permissions and `core.operations`.
4. Seed development data for a usable agenda loop.
5. Validate with unit, migration, build and E2E checks.

Rollback is application-level disablement of navigation/API exposure plus reverting the additive migration in non-production environments. In production, use a forward migration to archive/disable new operational entry points rather than dropping data immediately.
