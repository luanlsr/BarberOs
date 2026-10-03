## Why

BarberOS already has the operational loop implemented, but the MVP still needs a platform layer that lets the SaaS operator manage tenants, plans, subscriptions, support access and entitlement limits safely. This change turns the existing read-only Master Admin surface and seeded billing data into an auditable MVP-ready SaaS administration capability.

## What Changes

- Add a platform-admin domain for tenant overview, tenant lifecycle status, subscription state, plan assignment, entitlement limits, support actions and SaaS audit visibility.
- Create server APIs for Master Admin dashboards and controlled platform actions, with `PLATFORM_MASTER`/support authorization enforced server-side.
- Introduce plan and entitlement management that can drive tenant feature access, limits and UI/API gating without trusting browser-provided tenant data.
- Add tenant subscription and invoice lifecycle views and MVP billing operations, reusing the existing checkout/billing foundations where possible.
- Add audited tenant suspension/reactivation flows with reason, actor, request id and immutable audit log entries.
- Add support access controls that expose tenant health and metadata without silent private-data access or cross-tenant leakage.
- Upgrade the `/master` UI from a demo/read-only overview into a permission-aware MVP console with loading, empty, error and responsive states.
- Add focused tests for platform authorization, tenant isolation, entitlement enforcement, audited lifecycle actions and route/component behavior.

## Capabilities

### New Capabilities

- `platform-admin-billing`: Master Admin, SaaS plans, tenant subscriptions, entitlement limits, billing visibility, support controls and platform audit required to operate the MVP as a multi-tenant SaaS.

### Modified Capabilities

- `identity-access`: Platform admin and support authorization requirements expand to cover SaaS admin actions, entitlement enforcement and support-scoped access.

## Impact

- Affected code: `apps/web/app/master`, `apps/web/components/master-admin-view.tsx`, `apps/web/lib/master-admin-data.ts`, `apps/web/lib/billing/*`, `apps/web/src/modules/platform-data`, new platform-admin module boundaries, new `/api/v1/platform/*` routes, protected route/navigation logic and tests.
- Affected database: Supabase migrations for any missing platform-admin tables, constraints, RLS policies, indexes and audit records related to plans, subscriptions, entitlements, support actions and tenant lifecycle status.
- Affected contracts: shared TypeScript/Zod contracts for platform tenants, plans, entitlements, subscriptions, invoices, support actions and audit summaries.
- Affected systems: server-side authorization, entitlements, audit logging, billing provider integration boundaries, seed/demo data and CI validation.
