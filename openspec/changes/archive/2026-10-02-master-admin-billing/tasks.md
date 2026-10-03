## 1. Contracts and Permission Catalog

- [x] 1.1 Add platform-admin contracts for tenant summaries, lifecycle actions, SaaS plans, plan entitlements, tenant subscriptions, billing invoices, support scopes, entitlement decisions and audit filters, and verify contract parsing tests cover valid and invalid payloads.
- [x] 1.2 Add platform permissions such as `platform.tenants.read`, `platform.tenants.manage`, `platform.plans.manage`, `platform.billing.read`, `platform.billing.manage`, `platform.support.manage`, `platform.audit.read` and verify role catalog tests map them only to platform roles.
- [x] 1.3 Add entitlement decision types with source metadata (`PLAN`, `OVERRIDE`, `LEGACY_TENANT_ENTITLEMENT`, `MISSING`) and verify unit tests cover allow, deny and limit resolution shapes.

## 2. Database and RLS

- [x] 2.1 Inspect existing platform/billing tables and add an additive migration only for missing columns, constraints, support scopes, entitlement override metadata, indexes and audit-friendly lifecycle fields; verify migration SQL is versioned and idempotent.
- [x] 2.2 Add or tighten RLS policies for platform metadata tables so platform access is required and tenant operational policies remain tenant-scoped; verify with migration/RLS tests for platform and non-platform contexts.
- [x] 2.3 Extend seed/demo data for plans, plan entitlements, subscriptions, invoices, support scopes, tenant lifecycle states and platform audit examples, and verify local Master Admin can render meaningful MVP data.

## 3. Platform Admin Domain and Application Services

- [x] 3.1 Create `apps/web/src/modules/platform-admin` domain/application/infrastructure/presentation exports and verify module index imports compile.
- [x] 3.2 Implement platform authorization helpers that separate platform membership from tenant membership and verify tests deny tenant owners from platform operations.
- [x] 3.3 Implement tenant overview query service with aggregate tenant, subscription, billing, usage and health metadata, and verify tests do not expose private customer/order/message payloads.
- [x] 3.4 Implement tenant lifecycle service for suspend, restrict and reactivate actions with required reason and audit sink, and verify tests cover status transitions, missing reason and immutable audit events.
- [x] 3.5 Implement SaaS plan service for creating, updating and archiving plans and plan entitlements, and verify tests cover duplicate plan codes, archived plans and entitlement limits.
- [x] 3.6 Implement effective entitlement resolver using active subscription plan entitlements plus tenant overrides and legacy `tenant_entitlements`, and verify tests cover precedence and denial when no entitlement exists.
- [x] 3.7 Implement subscription and invoice read/update service for assignment, status changes and invoice summaries, and verify tests cover active, trialing, past-due, cancelled and expired states.
- [x] 3.8 Implement support scope service with purpose, expiration, allowed operation class and audit events, and verify tests deny expired or missing scopes.
- [x] 3.9 Implement platform audit query service with tenant, actor, action and date filters plus sensitive metadata redaction, and verify tests cover redacted billing/support payloads.

## 4. APIs and Integration Boundaries

- [x] 4.1 Add `/api/v1/platform/tenants` route handlers for tenant summaries and lifecycle actions, and verify route tests cover authorized, unauthorized and validation error responses.
- [x] 4.2 Add `/api/v1/platform/plans` route handlers for plan list/create/update/archive and entitlement definitions, and verify route tests cover duplicate code and archived-plan behavior.
- [x] 4.3 Add `/api/v1/platform/subscriptions` and `/api/v1/platform/invoices` route handlers for billing visibility and subscription status updates, and verify route tests cover platform-only access.
- [x] 4.4 Add `/api/v1/platform/entitlements` route handlers for effective entitlement reads and audited overrides, and verify route tests cover override allow/deny decisions.
- [x] 4.5 Add `/api/v1/platform/support-scopes` route handlers for support scope creation, expiration and lookup, and verify route tests cover missing purpose and expired access.
- [x] 4.6 Add `/api/v1/platform/audit` route handlers for filtered audit visibility, and verify route tests cover sensitive payload redaction and request id propagation.
- [x] 4.7 Update Asaas checkout/provisioning integration to use the effective plan/entitlement projection where needed, and verify existing checkout/webhook tests still pass.

## 5. Master Admin UI

- [x] 5.1 Replace direct `/master` demo aggregation with the new platform-admin data service while preserving demo fallback for missing persistence, and verify page rendering tests pass for platform and forbidden users.
- [x] 5.2 Upgrade `MasterAdminView` with responsive sections for tenants, plans, subscriptions, invoices, entitlements, support scopes and audit, and verify component tests cover loading, empty, error, permission denied and mobile-friendly states.
- [x] 5.3 Add action flows for tenant suspend/reactivate/restrict with reason capture and modal confirmation, and verify component tests cover outside-click modal close, disabled states and success/error feedback.
- [x] 5.4 Add plan and entitlement management forms using the shared form modal pattern, and verify component tests cover validation, limits and archived-plan UI.
- [x] 5.5 Add billing and subscription detail panels with invoice status totals and tenant tags, and verify UI tests cover active, trialing, past-due and cancelled states.
- [x] 5.6 Add support-scope and audit views with search/filter controls and redacted metadata display, and verify component tests cover expired scopes and redaction labels.
- [x] 5.7 Update navigation/protected route rules so `/master` and platform APIs are visible only to platform roles, and verify navigation/protected-area tests pass.

## 6. Quality and Validation

- [x] 6.1 Add focused tenant/platform isolation tests proving tenant users cannot list or mutate platform records and platform summary APIs do not leak tenant-private data.
- [x] 6.2 Add focused entitlement enforcement tests across at least one existing feature gate to prove active plan entitlements and overrides affect server-side access.
- [x] 6.3 Run platform-admin focused unit/component/route tests and verify all pass.
- [x] 6.4 Run `npm run typecheck --workspace @barberos/web` and verify TypeScript passes.
- [x] 6.5 Run `npx openspec validate master-admin-billing --strict` and fix any planning/spec issues.
- [x] 6.6 Run the repo validation command required by this change scope and confirm format, lint, typecheck, tests and build pass.
- [x] 6.7 Update `PRODUCT_COMPLETION_ROADMAP.md` to show Phase 1 in progress/completed status and the next MVP hardening epic after implementation.
