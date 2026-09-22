import type {
  NotificationDeliveryAttempt,
  NotificationIntent,
  RequestContext,
  WorkerJob,
} from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import { WorkerFailureReadService } from './worker-failure-read-service';

const context: RequestContext = {
  requestId: 'request-1',
  userId: 'operator-1',
  tenantId: 'tenant-1',
  membershipId: 'membership-1',
  role: 'OWNER',
  permissions: ['worker.failures.read'],
  entitlements: ['worker.operations'],
  branchScope: ['branch-1'],
};

describe('worker failure visibility integration', () => {
  it('shows appointment reminder provider failures to authorized operators', async () => {
    const job: WorkerJob = {
      id: 'job-reminder-delivery',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      type: 'NOTIFICATION_DELIVERY',
      status: 'DEAD_LETTERED',
      schemaVersion: 1,
      sourceType: 'NOTIFICATION_INTENT',
      sourceId: 'notification-reminder',
      notificationIntentId: 'notification-reminder',
      payload: { secret: 'job-payload-secret' },
      idempotencyKey: 'notification-reminder:delivery',
      correlationId: 'correlation-appointment',
      priority: 80,
      attemptCount: 8,
      maxAttempts: 8,
      runAt: '2026-09-22T10:00:00.000Z',
      lastError: {
        code: 'WORKER_RETRY_EXHAUSTED',
        message: 'Local notification provider is unavailable.',
        retryable: false,
      },
      createdAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-22T10:30:00.000Z',
    };
    const intent: NotificationIntent = {
      id: 'notification-reminder',
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
      correlationId: 'correlation-appointment',
      createdAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-22T10:30:00.000Z',
    };
    const attempt: NotificationDeliveryAttempt = {
      id: 'attempt-dead-letter',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      notificationIntentId: 'notification-reminder',
      channel: 'LOCAL',
      status: 'DEAD_LETTERED',
      attemptNumber: 8,
      provider: 'local-noop',
      error: {
        code: 'WORKER_RETRY_EXHAUSTED',
        message: 'Local notification provider is unavailable.',
        retryable: false,
      },
      createdAt: '2026-09-22T10:30:00.000Z',
    };
    const service = new WorkerFailureReadService({
      outbox: { listEvents: async () => [] },
      jobs: { listJobs: async () => [job] },
      notifications: {
        listIntents: async () => [intent],
        listDeliveryAttempts: async () => [attempt],
      },
    } as never);

    const summary = await service.summarize(context, { branchId: 'branch-1' });

    expect(summary.jobs[0]).toMatchObject({
      id: 'job-reminder-delivery',
      status: 'DEAD_LETTERED',
      lastError: { code: 'WORKER_RETRY_EXHAUSTED', retryable: false },
    });
    expect(summary.notifications[0]).toMatchObject({
      id: 'notification-reminder',
      status: 'FAILED',
      lastAttempt: { status: 'DEAD_LETTERED', provider: 'local-noop' },
    });
    expect(summary.metrics.find((metric) => metric.key === 'deadLetters')?.value).toBe(1);
    expect(summary.metrics.find((metric) => metric.key === 'notificationFailures')?.value).toBe(1);
    expect(JSON.stringify(summary)).not.toContain('job-payload-secret');
    expect(JSON.stringify(summary)).not.toContain('notification-payload-secret');
  });
});
