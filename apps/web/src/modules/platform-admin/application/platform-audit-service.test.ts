import { describe, expect, it } from 'vitest';
import type { PlatformAuditEntry } from '@barberos/contracts';

import { PlatformAuditService, type PlatformAuditRepository } from './platform-audit-service';
import type { PlatformRequestContext } from '../domain';

const platformContext: PlatformRequestContext = {
  requestId: 'request-platform-a',
  userId: 'platform-user-a',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.audit.read'],
};

function auditEntry(overrides: Partial<PlatformAuditEntry> = {}): PlatformAuditEntry {
  return {
    id: 'audit-a',
    action: 'SUBSCRIPTION_STATUS_CHANGED',
    actorUserId: 'platform-user-a',
    tenantId: 'tenant-a',
    targetType: 'tenant_subscription',
    targetId: 'subscription-a',
    result: 'SUCCESS',
    requestId: 'request-platform-a',
    metadata: {},
    createdAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('PlatformAuditService', () => {
  it('queries platform audit entries with filters and redacts sensitive metadata', async () => {
    let receivedFilters: unknown;
    const repository: PlatformAuditRepository = {
      async listAuditEntries(_context, filters) {
        receivedFilters = filters;
        return [
          auditEntry({
            metadata: {
              providerToken: 'secret-token',
              nested: {
                webhookSecret: 'secret-webhook',
                safe: 'kept',
              },
              paymentCard: {
                last4: '4242',
              },
              messageBody: 'private text',
            },
          }),
        ];
      },
    };
    const service = new PlatformAuditService(repository);

    const entries = await service.listAuditEntries(platformContext, {
      tenantId: 'tenant-a',
      action: 'SUBSCRIPTION_STATUS_CHANGED',
      startsAt: '2026-10-01T00:00:00.000Z',
      endsAt: '2026-10-31T23:59:59.000Z',
    });

    expect(receivedFilters).toMatchObject({
      tenantId: 'tenant-a',
      action: 'SUBSCRIPTION_STATUS_CHANGED',
      limit: 25,
    });
    expect(entries[0]?.metadata).toEqual({
      providerToken: '[redacted]',
      nested: {
        webhookSecret: '[redacted]',
        safe: 'kept',
      },
      paymentCard: '[redacted]',
      messageBody: '[redacted]',
    });
  });

  it('rejects invalid date filters', async () => {
    const service = new PlatformAuditService({
      async listAuditEntries() {
        return [];
      },
    });

    await expect(
      service.listAuditEntries(platformContext, {
        startsAt: '2026-11-01T00:00:00.000Z',
        endsAt: '2026-10-01T00:00:00.000Z',
      }),
    ).rejects.toThrow();
  });

  it('denies non-platform audit access', async () => {
    const service = new PlatformAuditService({
      async listAuditEntries() {
        return [];
      },
    });

    await expect(
      service.listAuditEntries({
        ...platformContext,
        role: 'OWNER',
      }),
    ).rejects.toMatchObject({ code: 'PLATFORM_ACCESS_DENIED' });
  });
});
