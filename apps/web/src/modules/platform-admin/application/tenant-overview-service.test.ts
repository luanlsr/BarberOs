import { describe, expect, it } from 'vitest';

import { PlatformAuthorizationError } from './platform-authorization';
import { TenantOverviewService } from './tenant-overview-service';
import type { PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform-a',
  userId: 'platform-user-a',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.tenants.read'],
};

describe('TenantOverviewService', () => {
  it('returns platform tenant summaries without private operational payloads', async () => {
    const service = new TenantOverviewService({
      async listTenants() {
        return [
          {
            tenantId: 'tenant-a',
            tenantName: 'Barbearia Centro',
            lifecycleStatus: 'ACTIVE',
            branchCount: 2,
            userCount: 8,
            planCode: 'PRO',
            planName: 'Pro',
            subscriptionStatus: 'ACTIVE',
            openBillingExposureCents: 0,
            usage: { appointmentsThisMonth: 120 },
            health: 'OK',
            createdAt: '2026-10-01T12:00:00.000Z',
            updatedAt: '2026-10-01T12:00:00.000Z',
            customers: [{ id: 'customer-a', phone: '+5511999999999' }],
            orders: [{ id: 'order-a', totalAmountCents: 9000 }],
            messages: [{ body: 'private message body' }],
          },
        ];
      },
    });

    const summaries = await service.listTenants(platformContext);

    expect(summaries).toEqual([
      {
        tenantId: 'tenant-a',
        tenantName: 'Barbearia Centro',
        lifecycleStatus: 'ACTIVE',
        branchCount: 2,
        userCount: 8,
        planCode: 'PRO',
        planName: 'Pro',
        subscriptionStatus: 'ACTIVE',
        openBillingExposureCents: 0,
        usage: { appointmentsThisMonth: 120 },
        health: 'OK',
        healthSignals: [],
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    ]);
    expect(summaries[0]).not.toHaveProperty('customers');
    expect(summaries[0]).not.toHaveProperty('orders');
    expect(summaries[0]).not.toHaveProperty('messages');
  });

  it('denies tenant users from platform tenant overview', async () => {
    const service = new TenantOverviewService({
      async listTenants() {
        return [];
      },
    });
    const ownerContext: PlatformRequestContext = {
      ...platformContext,
      role: 'OWNER',
      permissions: ['platform.tenants.read'],
    };

    await expect(service.listTenants(ownerContext)).rejects.toThrowError(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
  });
});
