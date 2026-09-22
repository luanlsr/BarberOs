import type { RequestContext } from '@barberos/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createNotificationStatusRouteHandlers,
  type NotificationStatusRouteService,
} from './notification-status-route-handlers';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['notifications.status.read'],
  entitlements: ['notifications'],
  branchScope: ['branch-1'],
};

const summary = {
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  generatedAt: '2026-09-22T10:00:00.000Z',
  notifications: [],
};

type MockService = NotificationStatusRouteService & {
  list: ReturnType<typeof vi.fn>;
};

describe('notification status route handlers', () => {
  let service: MockService;
  let handlers: ReturnType<typeof createNotificationStatusRouteHandlers>;

  beforeEach(() => {
    service = { list: vi.fn(async () => summary) };
    handlers = createNotificationStatusRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
  });

  it('passes status filters to the read service', async () => {
    const response = await handlers.GET(
      new Request(
        'https://barberos.local/api/v1/notifications/status?branchId=branch-1&status=FAILED&channel=LOCAL&limit=20',
      ),
    );

    expect(response.status).toBe(200);
    expect(service.list).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      status: 'FAILED',
      channel: 'LOCAL',
      limit: 20,
    });
    expect(await response.json()).toEqual({ data: summary, requestId: 'request-1' });
  });

  it('returns stable unauthenticated and sanitized authorization envelopes', async () => {
    handlers = createNotificationStatusRouteHandlers({
      resolveContext: vi.fn(async () => null),
      service,
    });
    let response = await handlers.GET(
      new Request('https://barberos.local/api/v1/notifications/status', {
        headers: { 'x-request-id': 'request-unauthenticated' },
      }),
    );
    expect(response.status).toBe(401);

    service.list.mockRejectedValueOnce(
      Object.assign(new Error('tenant-secret branch-secret'), { code: 'BRANCH_SCOPE_DENIED' }),
    );
    handlers = createNotificationStatusRouteHandlers({
      resolveContext: vi.fn(async () => context),
      service,
    });
    response = await handlers.GET(
      new Request('https://barberos.local/api/v1/notifications/status'),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: 'CORE_BRANCH_SCOPE_DENIED',
        message: 'Branch scope denied.',
        requestId: 'request-1',
      },
    });
    expect(JSON.stringify(body)).not.toContain('tenant-secret');
    expect(JSON.stringify(body)).not.toContain('branch-secret');
  });
});
