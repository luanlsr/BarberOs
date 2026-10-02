import { describe, expect, it, vi } from 'vitest';
import type { PlatformTenantSummary } from '@barberos/contracts';

import { PlatformAdminApplicationError } from './platform-admin-errors';
import { TenantLifecycleService, type TenantLifecycleRepository } from './tenant-lifecycle-service';
import type { PlatformAuditSink, PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform-a',
  userId: 'platform-user-a',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.tenants.manage'],
};

function tenant(overrides: Partial<PlatformTenantSummary> = {}): PlatformTenantSummary {
  return {
    tenantId: 'tenant-a',
    tenantName: 'Barbearia Centro',
    lifecycleStatus: 'ACTIVE',
    branchCount: 1,
    userCount: 4,
    planCode: 'PRO',
    planName: 'Pro',
    subscriptionStatus: 'ACTIVE',
    openBillingExposureCents: 0,
    usage: {},
    health: 'OK',
    healthSignals: [],
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

function setup(current: PlatformTenantSummary | null) {
  let stored = current;
  const repository: TenantLifecycleRepository = {
    async findTenantById() {
      return stored;
    },
    async updateTenantLifecycle(_context, input) {
      if (!stored) throw new Error('Unexpected update without tenant.');
      stored = {
        ...stored,
        lifecycleStatus: input.nextStatus,
        updatedAt: '2026-10-01T13:00:00.000Z',
      };
      return stored;
    },
  };
  const audit: PlatformAuditSink = {
    record: vi.fn(async () => undefined),
  };

  return { service: new TenantLifecycleService({ repository, auditSink: audit }), audit };
}

describe('TenantLifecycleService', () => {
  it('suspends tenants with a required reason and immutable audit event', async () => {
    const { service, audit } = setup(tenant());

    const updated = await service.applyLifecycleAction(platformContext, {
      tenantId: 'tenant-a',
      action: 'SUSPEND',
      reason: 'Invoice vencida ha mais de 30 dias.',
      requestId: 'request-lifecycle-a',
    });

    expect(updated.lifecycleStatus).toBe('SUSPENDED');
    expect(audit.record).toHaveBeenCalledWith(
      platformContext,
      expect.objectContaining({
        action: 'TENANT_SUSPENDED',
        tenantId: 'tenant-a',
        targetType: 'tenant',
        targetId: 'tenant-a',
        result: 'SUCCESS',
        requestId: 'request-lifecycle-a',
        reason: 'Invoice vencida ha mais de 30 dias.',
        metadata: expect.objectContaining({
          previousStatus: 'ACTIVE',
          nextStatus: 'SUSPENDED',
        }),
      }),
    );
  });

  it('reactivates trialing tenants back to trialing state', async () => {
    const { service } = setup(
      tenant({ lifecycleStatus: 'SUSPENDED', subscriptionStatus: 'TRIALING' }),
    );

    const updated = await service.applyLifecycleAction(platformContext, {
      tenantId: 'tenant-a',
      action: 'REACTIVATE',
      reason: 'Pagamento regularizado durante trial.',
    });

    expect(updated.lifecycleStatus).toBe('TRIALING');
  });

  it('rejects missing lifecycle reasons before mutating or auditing', async () => {
    const { service, audit } = setup(tenant());

    await expect(
      service.applyLifecycleAction(platformContext, {
        tenantId: 'tenant-a',
        action: 'SUSPEND',
        reason: '',
      }),
    ).rejects.toThrow();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects invalid reactivation transitions without audit', async () => {
    const { service, audit } = setup(tenant({ lifecycleStatus: 'ACTIVE' }));

    await expect(
      service.applyLifecycleAction(platformContext, {
        tenantId: 'tenant-a',
        action: 'REACTIVATE',
        reason: 'Tentativa indevida.',
      }),
    ).rejects.toThrowError(
      new PlatformAdminApplicationError(
        'PLATFORM_ADMIN_INVALID_STATUS',
        'Only suspended or restricted tenants can be reactivated.',
      ),
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('denies users without tenant management platform permission', async () => {
    const { service } = setup(tenant());

    await expect(
      service.applyLifecycleAction(
        {
          ...platformContext,
          permissions: ['platform.tenants.read'],
        },
        {
          tenantId: 'tenant-a',
          action: 'RESTRICT',
          reason: 'Limitar operacao por risco.',
        },
      ),
    ).rejects.toMatchObject({ code: 'PLATFORM_PERMISSION_DENIED' });
  });
});
