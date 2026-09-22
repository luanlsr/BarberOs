import type {
  NotificationDeliveryAttempt,
  NotificationIntent,
  RequestContext,
} from '@barberos/contracts';
import { describe, expect, it, vi } from 'vitest';

import { NotificationStatusReadService } from './notification-status-read-service';

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

const intent: NotificationIntent = {
  id: 'notification-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  recipientType: 'CUSTOMER',
  recipientId: 'customer-1',
  channel: 'LOCAL',
  templateKey: 'appointment.reminder.v1',
  sourceType: 'APPOINTMENT',
  sourceId: 'appointment-1',
  payload: { secret: 'notification-payload-secret' },
  status: 'FAILED',
  idempotencyKey: 'appointment-1:notification',
  correlationId: 'correlation-1',
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:10:00.000Z',
};

const attempt: NotificationDeliveryAttempt = {
  id: 'attempt-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  notificationIntentId: 'notification-1',
  channel: 'LOCAL',
  status: 'FAILED',
  attemptNumber: 1,
  provider: 'local-noop',
  error: { code: 'NOTIFICATION_DELIVERY_FAILED', message: 'Delivery failed.', retryable: false },
  createdAt: '2026-09-22T10:10:00.000Z',
};

describe('NotificationStatusReadService', () => {
  it('lists scoped notification status without raw payloads', async () => {
    const repository = {
      listIntents: vi.fn(async () => [intent]),
      listDeliveryAttempts: vi.fn(async () => [attempt]),
    };
    const service = new NotificationStatusReadService(repository as never);

    const summary = await service.list(context, {
      branchId: 'branch-1',
      status: 'FAILED',
      limit: 20,
    });

    expect(repository.listIntents).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      status: 'FAILED',
      channel: undefined,
      limit: 20,
    });
    expect(repository.listDeliveryAttempts).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      channel: undefined,
      limit: 20,
    });
    expect(summary.notifications[0]).toMatchObject({
      id: 'notification-1',
      status: 'FAILED',
      lastAttempt: { provider: 'local-noop', status: 'FAILED' },
    });
    expect(JSON.stringify(summary)).not.toContain('notification-payload-secret');
  });

  it('denies missing permission, entitlement and branch scope', async () => {
    const service = new NotificationStatusReadService({
      listIntents: vi.fn(),
      listDeliveryAttempts: vi.fn(),
    } as never);

    await expect(
      service.list({ ...context, permissions: [] }, { branchId: 'branch-1' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(
      service.list({ ...context, entitlements: [] }, { branchId: 'branch-1' }),
    ).rejects.toMatchObject({ code: 'ENTITLEMENT_DENIED' });
    await expect(service.list(context, { branchId: 'branch-2' })).rejects.toMatchObject({
      code: 'BRANCH_SCOPE_DENIED',
    });
  });
});
