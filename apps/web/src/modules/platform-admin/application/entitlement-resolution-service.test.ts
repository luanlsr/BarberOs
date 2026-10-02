import { describe, expect, it, vi } from 'vitest';
import type { Entitlement } from '@barberos/contracts';

import {
  EntitlementResolutionService,
  type EntitlementResolutionRepository,
  type LegacyTenantEntitlementRecord,
  type PlanEntitlementRecord,
  type TenantEntitlementOverrideRecord,
} from './entitlement-resolution-service';
import type { PlatformAuditSink, PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform-a',
  userId: 'platform-user-a',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.tenants.read', 'platform.tenants.manage'],
};

function setup(records: {
  override?: TenantEntitlementOverrideRecord | null;
  plan?: PlanEntitlementRecord | null;
  legacy?: LegacyTenantEntitlementRecord | null;
}) {
  const repository: EntitlementResolutionRepository = {
    async applyOverride(_context, command) {
      return {
        id: 'override-applied',
        tenantId: command.tenantId,
        entitlement: command.entitlement,
        enabled: command.enabled,
        limit: command.limit,
        reason: command.reason,
        expiresAt: command.expiresAt,
      };
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

  return new EntitlementResolutionService({
    repository,
    now: () => new Date('2026-10-01T12:00:00.000Z'),
  });
}

function setupWithAudit(records: Parameters<typeof setup>[0]) {
  const audit: PlatformAuditSink = {
    record: vi.fn(async () => undefined),
  };
  const repository: EntitlementResolutionRepository = {
    async applyOverride(_context, command) {
      return {
        id: 'override-applied',
        tenantId: command.tenantId,
        entitlement: command.entitlement,
        enabled: command.enabled,
        limit: command.limit,
        reason: command.reason,
        expiresAt: command.expiresAt,
      };
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

  return {
    audit,
    service: new EntitlementResolutionService({
      repository,
      auditSink: audit,
      now: () => new Date('2026-10-01T12:00:00.000Z'),
    }),
  };
}

describe('EntitlementResolutionService', () => {
  it('uses active overrides before plan entitlements', async () => {
    const service = setup({
      override: {
        id: 'override-a',
        tenantId: 'tenant-a',
        entitlement: 'ai',
        enabled: false,
        reason: 'Paused by support.',
      },
      plan: {
        planId: 'plan-ai',
        entitlement: 'ai',
        enabled: true,
        limit: 1000,
      },
    });

    const decision = await service.resolveEntitlement(platformContext, {
      tenantId: 'tenant-a',
      entitlement: 'ai',
    });

    expect(decision).toMatchObject({
      allowed: false,
      source: 'OVERRIDE',
      overrideId: 'override-a',
      reason: 'Paused by support.',
    });
  });

  it('uses plan entitlements when no active override exists', async () => {
    const service = setup({
      override: {
        id: 'override-expired',
        tenantId: 'tenant-a',
        entitlement: 'campaigns',
        enabled: false,
        expiresAt: '2026-10-01T11:59:00.000Z',
      },
      plan: {
        planId: 'plan-pro',
        entitlement: 'campaigns',
        enabled: true,
        limit: 5000,
      },
    });

    const decision = await service.resolveEntitlement(platformContext, {
      tenantId: 'tenant-a',
      entitlement: 'campaigns',
    });

    expect(decision).toMatchObject({
      allowed: true,
      source: 'PLAN',
      planId: 'plan-pro',
      limit: 5000,
    });
  });

  it('falls back to legacy tenant entitlements for compatibility', async () => {
    const service = setup({
      legacy: {
        tenantId: 'tenant-a',
        entitlement: 'finance',
        enabled: true,
      },
    });

    const decision = await service.resolveEntitlement(platformContext, {
      tenantId: 'tenant-a',
      entitlement: 'finance',
    });

    expect(decision).toMatchObject({
      allowed: true,
      source: 'LEGACY_TENANT_ENTITLEMENT',
    });
  });

  it('denies missing entitlements with a missing source', async () => {
    const service = setup({});

    const decision = await service.resolveEntitlement(platformContext, {
      tenantId: 'tenant-a',
      entitlement: 'inventory',
    });

    expect(decision).toMatchObject({
      allowed: false,
      source: 'MISSING',
    });
  });

  it('applies entitlement overrides and records audit', async () => {
    const { service, audit } = setupWithAudit({});

    const decision = await service.applyEntitlementOverride(platformContext, {
      tenantId: 'tenant-a',
      entitlement: 'ai',
      enabled: true,
      limit: 500,
      reason: 'Commercial exception.',
    });

    expect(decision).toMatchObject({
      allowed: true,
      source: 'OVERRIDE',
      overrideId: 'override-applied',
      limit: 500,
    });
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'ENTITLEMENT_OVERRIDE_APPLIED',
        tenantId: 'tenant-a',
        reason: 'Commercial exception.',
      }),
    );
  });

  it('denies tenant users from cross-tenant entitlement debug resolution', async () => {
    const service = setup({});

    await expect(
      service.resolveEntitlement(
        {
          ...platformContext,
          role: 'OWNER',
        },
        { tenantId: 'tenant-a', entitlement: 'finance' },
      ),
    ).rejects.toMatchObject({ code: 'PLATFORM_ACCESS_DENIED' });
  });
});

function matches(
  record:
    | Pick<TenantEntitlementOverrideRecord, 'tenantId' | 'entitlement'>
    | Pick<LegacyTenantEntitlementRecord, 'tenantId' | 'entitlement'>
    | null
    | undefined,
  tenantId: string,
  entitlement: Entitlement,
) {
  return record?.tenantId === tenantId && record.entitlement === entitlement;
}
