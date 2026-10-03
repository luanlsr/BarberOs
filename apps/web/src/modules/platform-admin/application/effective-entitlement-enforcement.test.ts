import { describe, expect, it } from 'vitest';
import { AuthorizationError, authorize } from '@barberos/permissions';
import type { Entitlement, RequestContext } from '@barberos/contracts';

import { EntitlementResolutionService } from './entitlement-resolution-service';
import type {
  EntitlementResolutionRepository,
  LegacyTenantEntitlementRecord,
  PlanEntitlementRecord,
  TenantEntitlementOverrideRecord,
} from './entitlement-resolution-service';
import type { PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform',
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.tenants.read'],
};

describe('effective entitlement enforcement', () => {
  it('allows an existing server-side feature gate when an active plan grants entitlement', async () => {
    const decision = await resolver({
      plan: {
        planId: 'plan-pro',
        entitlement: 'inventory',
        enabled: true,
      },
    }).resolveEntitlement(platformContext, {
      tenantId: 'tenant-1',
      entitlement: 'inventory',
    });

    expect(() =>
      authorize(requestContextFromDecision(decision.allowed ? [decision.entitlement] : []), {
        permission: 'inventory.read',
        entitlement: 'inventory',
        branchId: 'branch-1',
      }),
    ).not.toThrow();
  });

  it('denies the same server-side feature gate when an override disables the plan entitlement', async () => {
    const decision = await resolver({
      override: {
        id: 'override-deny',
        tenantId: 'tenant-1',
        entitlement: 'inventory',
        enabled: false,
        reason: 'Billing restriction.',
      },
      plan: {
        planId: 'plan-pro',
        entitlement: 'inventory',
        enabled: true,
      },
    }).resolveEntitlement(platformContext, {
      tenantId: 'tenant-1',
      entitlement: 'inventory',
    });

    expect(() =>
      authorize(requestContextFromDecision(decision.allowed ? [decision.entitlement] : []), {
        permission: 'inventory.read',
        entitlement: 'inventory',
        branchId: 'branch-1',
      }),
    ).toThrowError(
      new AuthorizationError('ENTITLEMENT_DENIED', 'Feature entitlement is unavailable.'),
    );
  });

  it('allows the feature gate when an override enables access over a disabled plan', async () => {
    const decision = await resolver({
      override: {
        id: 'override-allow',
        tenantId: 'tenant-1',
        entitlement: 'inventory',
        enabled: true,
        reason: 'Temporary commercial exception.',
      },
      plan: {
        planId: 'plan-basic',
        entitlement: 'inventory',
        enabled: false,
      },
    }).resolveEntitlement(platformContext, {
      tenantId: 'tenant-1',
      entitlement: 'inventory',
    });

    expect(() =>
      authorize(requestContextFromDecision(decision.allowed ? [decision.entitlement] : []), {
        permission: 'inventory.read',
        entitlement: 'inventory',
        branchId: 'branch-1',
      }),
    ).not.toThrow();
  });
});

function resolver(records: {
  override?: TenantEntitlementOverrideRecord;
  plan?: PlanEntitlementRecord;
  legacy?: LegacyTenantEntitlementRecord;
}) {
  const repository: EntitlementResolutionRepository = {
    async applyOverride() {
      throw new Error('not used');
    },
    async findActiveOverride(_context, tenantId, entitlement) {
      return matches(records.override, tenantId, entitlement) ? (records.override ?? null) : null;
    },
    async findActivePlanEntitlement(_context, _tenantId, entitlement) {
      return records.plan?.entitlement === entitlement ? records.plan : null;
    },
    async findLegacyTenantEntitlement(_context, tenantId, entitlement) {
      return matches(records.legacy, tenantId, entitlement) ? (records.legacy ?? null) : null;
    },
  };
  return new EntitlementResolutionService({ repository });
}

function requestContextFromDecision(entitlements: Entitlement[]): RequestContext {
  return {
    requestId: 'request-tenant',
    userId: 'tenant-user-1',
    tenantId: 'tenant-1',
    membershipId: 'membership-1',
    role: 'OWNER',
    permissions: ['inventory.read'],
    entitlements,
    branchScope: ['branch-1'],
  };
}

function matches(
  record:
    | Pick<TenantEntitlementOverrideRecord, 'tenantId' | 'entitlement'>
    | Pick<LegacyTenantEntitlementRecord, 'tenantId' | 'entitlement'>
    | undefined,
  tenantId: string,
  entitlement: Entitlement,
) {
  return record?.tenantId === tenantId && record.entitlement === entitlement;
}
