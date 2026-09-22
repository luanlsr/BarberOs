import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  NotificationDeliveryAttempt,
  NotificationIntent,
  OutboxEvent,
  RequestContext,
  WorkerJob,
} from '@barberos/contracts';

import { WorkerFailureReadService } from './worker-failure-read-service';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['worker.failures.read'],
  entitlements: ['worker.operations'],
  branchScope: ['branch-1'],
};

const outboxEvent: OutboxEvent = {
  id: 'outbox-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
  sourceType: 'NOTIFICATION_INTENT',
  sourceId: 'notification-1',
  payload: { secret: 'payload-secret' },
  idempotencyKey: 'notification-1:delivery',
  status: 'DEAD_LETTERED',
  correlationId: 'correlation-1',
  schemaVersion: 1,
  attemptCount: 5,
  availableAt: '2026-09-22T10:00:00.000Z',
  lastError: { code: 'WORKER_RETRY_EXHAUSTED', message: 'Retry exhausted.', retryable: false },
  createdAt: '2026-09-22T09:00:00.000Z',
  updatedAt: '2026-09-22T10:05:00.000Z',
};

const workerJob: WorkerJob = {
  id: 'job-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  type: 'NOTIFICATION_DELIVERY',
  status: 'RETRY_SCHEDULED',
  schemaVersion: 1,
  sourceType: 'NOTIFICATION_INTENT',
  sourceId: 'notification-1',
  outboxEventId: 'outbox-1',
  notificationIntentId: 'notification-1',
  payload: { secret: 'job-payload-secret' },
  idempotencyKey: 'notification-1:job',
  correlationId: 'correlation-1',
  priority: 90,
  attemptCount: 2,
  maxAttempts: 5,
  runAt: '2026-09-22T10:30:00.000Z',
  lastError: {
    code: 'WORKER_PROVIDER_UNAVAILABLE',
    message: 'Provider unavailable.',
    retryable: true,
  },
  createdAt: '2026-09-22T09:00:00.000Z',
  updatedAt: '2026-09-22T10:10:00.000Z',
};

const notificationIntent: NotificationIntent = {
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
  createdAt: '2026-09-22T09:00:00.000Z',
  updatedAt: '2026-09-22T10:15:00.000Z',
};

const deliveryAttempt: NotificationDeliveryAttempt = {
  id: 'attempt-1',
  tenantId: 'tenant-1',
  branchId: 'branch-1',
  notificationIntentId: 'notification-1',
  channel: 'LOCAL',
  status: 'FAILED',
  attemptNumber: 2,
  provider: 'local-noop',
  error: { code: 'WORKER_PROVIDER_UNAVAILABLE', message: 'Provider unavailable.', retryable: true },
  createdAt: '2026-09-22T10:15:00.000Z',
};

describe('WorkerFailureReadService', () => {
  let repositories: {
    outbox: { listEvents: ReturnType<typeof vi.fn> };
    jobs: { listJobs: ReturnType<typeof vi.fn> };
    notifications: {
      listIntents: ReturnType<typeof vi.fn>;
      listDeliveryAttempts: ReturnType<typeof vi.fn>;
    };
  };
  let service: WorkerFailureReadService;

  beforeEach(() => {
    repositories = {
      outbox: { listEvents: vi.fn(async () => [outboxEvent]) },
      jobs: { listJobs: vi.fn(async () => [workerJob]) },
      notifications: {
        listIntents: vi.fn(async () => [notificationIntent]),
        listDeliveryAttempts: vi.fn(async () => [deliveryAttempt]),
      },
    };
    service = new WorkerFailureReadService(repositories as never);
  });

  it('returns scoped operational failures without raw payloads', async () => {
    const summary = await service.summarize(context, { branchId: 'branch-1', limit: 10 });

    expect(repositories.outbox.listEvents).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      status: undefined,
      limit: 10,
    });
    expect(repositories.jobs.listJobs).toHaveBeenCalledWith(context, {
      branchId: 'branch-1',
      status: undefined,
      limit: 10,
    });
    expect(summary.metrics.find((metric) => metric.key === 'deadLetters')?.value).toBe(1);
    expect(summary.metrics.find((metric) => metric.key === 'jobsRetrying')?.value).toBe(1);
    expect(summary.notifications[0]?.lastAttempt?.provider).toBe('local-noop');
    expect(JSON.stringify(summary)).not.toContain('payload-secret');
    expect(JSON.stringify(summary)).not.toContain('job-payload-secret');
    expect(JSON.stringify(summary)).not.toContain('notification-payload-secret');
  });

  it('denies access without permission, entitlement or branch scope', async () => {
    await expect(
      service.summarize({ ...context, permissions: [] }, { branchId: 'branch-1' }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    await expect(
      service.summarize({ ...context, entitlements: [] }, { branchId: 'branch-1' }),
    ).rejects.toMatchObject({ code: 'ENTITLEMENT_DENIED' });
    await expect(service.summarize(context, { branchId: 'branch-2' })).rejects.toMatchObject({
      code: 'BRANCH_SCOPE_DENIED',
    });
  });
});
