## Context

The repo already contains the first pieces of platform administration: `/master` renders a read-only `MasterAdminView`, `master-admin-data.ts` aggregates tenants/plans/subscriptions/invoices/usage from Supabase with demo fallback, `platform_admin_views` adds feature flags and incidents, and the Asaas checkout flow provisions tenants, branches, memberships, subscriptions and plan entitlements after payment.

The missing piece is a proper product/domain boundary for SaaS administration. Today platform data is pulled directly into a page data loader, platform actions are not modeled as application services, and plan/subscription/entitlement behavior is not yet a tested server-side contract for MVP operations.

## Goals / Non-Goals

**Goals:**

- Add a modular platform-admin/billing capability under `apps/web` with domain, application, infrastructure and presentation boundaries.
- Preserve server-side platform authorization and deny-by-default behavior for every Master Admin operation.
- Make plans, subscriptions, tenant lifecycle, entitlement overrides, billing visibility, support scopes and platform audit operational enough for MVP.
- Reuse existing Asaas checkout/provisioning work and existing Supabase tables where they already satisfy the model.
- Upgrade `/master` into a responsive operational console while keeping platform-only data out of normal tenant navigation.
- Add focused tests for platform permissions, entitlement resolution, tenant lifecycle audit, support access and route/component behavior.

**Non-Goals:**

- Building the full production hardening epic; broad E2E, CI/CD, deployment runbooks and load/observability work stay in `production-mvp-hardening`.
- Implementing Barber AI, AI tool execution or AI-specific audit beyond showing usage metadata already available.
- Building advanced billing provider automation such as proration, coupons, chargeback handling or multi-provider reconciliation.
- Allowing support impersonation to silently browse tenant-private records. This change may create support scopes, but private operational access remains explicit and audited.

## Decisions

### 1. Introduce `platform-admin` as a real module

Create `apps/web/src/modules/platform-admin` with:

- `domain/`: tenant summary, SaaS plan, plan entitlement, tenant subscription, billing invoice, support scope, platform audit and lifecycle command types.
- `application/`: services for dashboard queries, plan management, subscription assignment/status changes, tenant lifecycle actions, entitlement overrides, support scopes and audit queries.
- `infrastructure/`: Supabase repositories and audit sink.
- `presentation/`: route handlers returning stable JSON errors and request ids.

Alternative considered: continue extending `lib/master-admin-data.ts`. Rejected because action-heavy platform administration needs the same service/repository/test structure as finance, inventory, payments and messaging.

### 2. Keep tenant operations and platform operations separate

Platform operations use explicit platform authorization (`PLATFORM_MASTER`, later `PLATFORM_SUPPORT` with limited permissions) and do not reuse tenant-scoped `RequestContext` as if platform admins belonged to every tenant. Tenant-private reads require a support scope; tenant summary/billing metadata does not.

Alternative considered: give `PLATFORM_MASTER` all tenant operational permissions and reuse normal tenant APIs. Rejected because it increases leakage risk and conflicts with the PRD rule that Master Admin must not silently access private tenant data.

### 3. Resolve effective entitlements from subscription plans plus overrides

The implementation should keep existing `tenant_entitlements` compatible, but add an effective-entitlement resolver that can explain whether access came from the active plan, a tenant override or a disabled/missing plan entitlement. Plan limits remain numeric metadata attached to plan entitlements.

Alternative considered: copy all plan entitlements into `tenant_entitlements` and treat that table as final truth. Rejected as insufficient for billing changes and audit/debug visibility, but retained as compatibility data for existing gates.

### 4. Use append-only audit for lifecycle/support/billing actions

Tenant suspension/reactivation, plan edits, subscription assignment/status changes, entitlement overrides and support scopes emit `audit_logs` records with before/after state, reason and request id. No action should overwrite paid or historical billing state destructively.

Alternative considered: store only current status on tenant/subscription rows. Rejected because MVP support and billing disputes require traceability.

### 5. Migrate existing `/master` UI incrementally

The current Master Admin view can be kept as the first shell, but data should come from new route/application services. Add sections and controls for tenants, plans, subscriptions, invoices, entitlement overrides, support scopes and audit. Keep a server-side guard on `/master` and add client-visible forbidden/empty/error states for component tests.

Alternative considered: redesign the page from scratch. Rejected to keep the MVP path shorter and reduce visual churn.

## Risks / Trade-offs

- [Risk] Existing seeded platform data may not cover all real lifecycle states. -> Add migrations/seeds for missing enum values and tests for inactive, trialing, past-due, suspended and cancelled states.
- [Risk] Entitlement behavior may diverge between copied `tenant_entitlements` and plan-derived access. -> Centralize effective entitlement resolution and update tenant entitlement rows only as compatibility/projection data.
- [Risk] Support access could accidentally become broad impersonation. -> Require explicit support scopes with expiration and audit, and keep private operational data out of platform summary APIs.
- [Risk] Billing provider events may be incomplete for production. -> Keep provider integration boundary narrow and expose current Asaas state as MVP billing visibility, leaving advanced reconciliation to hardening.
- [Risk] Platform admin UI can become dense on mobile. -> Use responsive section navigation, compact tables/cards and pagination/search for larger lists.

## Migration Plan

1. Add or extend contracts for platform tenant summaries, plan commands, subscription commands, entitlement decisions, support scopes and platform audit filters.
2. Add migrations only for missing structures, constraints or indexes; preserve existing `saas_plans`, `plan_entitlements`, `tenant_subscriptions`, `billing_invoices`, `platform_feature_flags`, `platform_incidents`, `tenant_entitlements` and `audit_logs` where compatible.
3. Add RLS policies and repository filters that allow platform metadata access only through platform authorization and keep tenant operational RLS intact.
4. Implement application services and route handlers behind `/api/v1/platform/*`.
5. Move `/master` data loading to the new services and incrementally add action surfaces.
6. Add tests before marking tasks complete: application service authorization/isolation, route errors, entitlement resolver, tenant lifecycle audit and component states.
7. Validate with focused tests, `npx openspec validate master-admin-billing --strict`, typecheck and repo validation as scoped.

Rollback strategy: keep additive migrations; disable new platform actions in UI/navigation if needed while leaving read-only `/master` summaries and existing checkout provisioning intact.
