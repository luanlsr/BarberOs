import type { PlatformAuditEntry } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformAuthorizationError } from '../application/platform-authorization';
import type { PlatformRequestContext } from '../domain';
import {
  createPlatformAuditRouteHandlers,
  type PlatformAuditRouteService,
} from './platform-audit-route-handlers';

const context: PlatformRequestContext = {
  requestId: 'request-1',
  userId: 'platform-user-1',
  role: 'PLATFORM_MASTER',
  permissions: ['platform.audit.read'],
};

const auditEntry: PlatformAuditEntry = {
  id: 'audit-1',
  action: 'SUBSCRIPTION_STATUS_CHANGED',
  actorUserId: 'platform-user-1',
  tenantId: 'tenant-1',
  targetType: 'tenant_subscription',
  targetId: 'subscription-1',
  result: 'SUCCESS',
  requestId: 'request-audit-source',
  metadata: {
    providerToken: '[redacted]',
    nested: { safe: 'kept', webhookSecret: '[redacted]' },
  },
  createdAt: '2026-10-01T12:00:00.000Z',
};

type MockAuditRouteService = PlatformAuditRouteService & {
  listAuditEntries: ReturnType<typeof vi.fn>;
};

describe('platform audit route handlers', () => {
  let service: MockAuditRouteService;

  beforeEach(() => {
    service = {
      listAuditEntries: vi.fn(async () => [auditEntry]),
    };
  });

  it('lists audit entries with filters and propagates request id', async () => {
    const handlers = createPlatformAuditRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/platform/audit?tenantId=tenant-1&actorUserId=platform-user-1&action=SUBSCRIPTION_STATUS_CHANGED&startsAt=2026-10-01T00:00:00.000Z&endsAt=2026-10-31T23:59:59.000Z&limit=50&cursor=2026-10-02T00:00:00.000Z',
      ),
    );

    expect(response.status).toBe(200);
    expect(service.listAuditEntries).toHaveBeenCalledWith(context, {
      tenantId: 'tenant-1',
      actorUserId: 'platform-user-1',
      action: 'SUBSCRIPTION_STATUS_CHANGED',
      startsAt: '2026-10-01T00:00:00.000Z',
      endsAt: '2026-10-31T23:59:59.000Z',
      limit: 50,
      cursor: '2026-10-02T00:00:00.000Z',
    });
    expect(await response.json()).toEqual({ data: [auditEntry], requestId: 'request-1' });
  });

  it('returns redacted metadata from the service without exposing sensitive payloads', async () => {
    const handlers = createPlatformAuditRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    const response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/audit'),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data[0].metadata).toEqual({
      providerToken: '[redacted]',
      nested: { safe: 'kept', webhookSecret: '[redacted]' },
    });
  });

  it('returns stable errors for invalid filters and non-platform access', async () => {
    const handlers = createPlatformAuditRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });

    let response: Response = await handlers.GET(
      new Request('https://barberos.local/api/v1/platform/audit?limit=abc'),
    );
    expect(response.status).toBe(400);

    service.listAuditEntries.mockRejectedValueOnce(
      new PlatformAuthorizationError('PLATFORM_ACCESS_DENIED', 'Platform membership is required.'),
    );
    response = await handlers.GET(new Request('https://barberos.local/api/v1/platform/audit'));
    expect(response.status).toBe(403);
  });
});
