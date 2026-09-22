import type {
  NotificationDeliveryAttempt,
  NotificationIntent,
  WorkerJob,
} from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import {
  handleNotificationDelivery,
  LocalNoopNotificationProvider,
  type NotificationProviderAdapter,
} from './notification-delivery-handler';

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
  payload: { appointmentId: 'appointment-1' },
  status: 'PENDING',
  idempotencyKey: 'appointment-1:notification',
  correlationId: 'correlation-1',
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
};

describe('notification delivery handler', () => {
  it('records sent attempts through the local noop provider', async () => {
    const attempts: NotificationDeliveryAttempt[] = [];
    const result = await handleNotificationDelivery(makeJob(), {
      notifications: notificationPorts(attempts),
      provider: new LocalNoopNotificationProvider(),
      now: () => new Date('2026-09-22T10:05:00.000Z'),
    });

    expect(result).toEqual({ status: 'succeeded', effect: 'notification_delivered' });
    expect(attempts).toEqual([
      expect.objectContaining({
        notificationIntentId: 'notification-1',
        status: 'SENT',
        attemptNumber: 1,
        provider: 'local-noop',
        providerMessageId: 'local:notification-1:job-1',
        sentAt: '2026-09-22T10:05:00.000Z',
      }),
    ]);
  });

  it('records retry-scheduled attempts for provider unavailable and rate-limited responses', async () => {
    const unavailableAttempts: NotificationDeliveryAttempt[] = [];
    const unavailable = await handleNotificationDelivery(makeJob({ attemptCount: 1 }), {
      notifications: notificationPorts(unavailableAttempts),
      provider: new LocalNoopNotificationProvider({ mode: 'retryable_failure' }),
      now: () => new Date('2026-09-22T10:05:00.000Z'),
    });
    const rateLimitedAttempts: NotificationDeliveryAttempt[] = [];
    const rateLimited = await handleNotificationDelivery(makeJob({ attemptCount: 1 }), {
      notifications: notificationPorts(rateLimitedAttempts),
      provider: new LocalNoopNotificationProvider({ mode: 'rate_limited', retryAfterMs: 90_000 }),
      now: () => new Date('2026-09-22T10:05:00.000Z'),
    });

    expect(unavailable).toEqual({
      status: 'skipped',
      reason: 'notification_delivery_retry_scheduled',
    });
    expect(rateLimited).toEqual({
      status: 'skipped',
      reason: 'notification_delivery_retry_scheduled',
    });
    expect(unavailableAttempts[0]).toMatchObject({
      status: 'RETRY_SCHEDULED',
      attemptNumber: 2,
      error: { code: 'WORKER_PROVIDER_UNAVAILABLE', retryable: true },
    });
    expect(rateLimitedAttempts[0]).toMatchObject({
      status: 'RETRY_SCHEDULED',
      attemptNumber: 2,
      error: { code: 'WORKER_RATE_LIMITED', retryable: true },
    });
  });

  it('records dead-letter attempts when retries are exhausted', async () => {
    const attempts: NotificationDeliveryAttempt[] = [];
    const result = await handleNotificationDelivery(makeJob({ attemptCount: 4, maxAttempts: 5 }), {
      notifications: notificationPorts(attempts),
      provider: new LocalNoopNotificationProvider({ mode: 'retryable_failure' }),
      now: () => new Date('2026-09-22T10:05:00.000Z'),
    });

    expect(result).toEqual({ status: 'skipped', reason: 'notification_delivery_failed' });
    expect(attempts[0]).toMatchObject({
      status: 'DEAD_LETTERED',
      attemptNumber: 5,
      error: { code: 'WORKER_RETRY_EXHAUSTED', retryable: false },
    });
  });

  it('supports provider adapters without exposing raw provider responses', async () => {
    const attempts: NotificationDeliveryAttempt[] = [];
    const provider: NotificationProviderAdapter = {
      provider: 'custom-provider',
      async deliver() {
        return {
          status: 'failed',
          error: {
            code: 'NOTIFICATION_DELIVERY_FAILED',
            message: 'Sanitized provider failure.',
            retryable: false,
          },
        };
      },
    };

    await handleNotificationDelivery(makeJob(), {
      notifications: notificationPorts(attempts),
      provider,
      now: () => new Date('2026-09-22T10:05:00.000Z'),
    });

    expect(JSON.stringify(attempts)).not.toContain('providerResponse');
    expect(attempts[0]).toMatchObject({
      provider: 'custom-provider',
      status: 'FAILED',
      error: { code: 'NOTIFICATION_DELIVERY_FAILED', retryable: false },
    });
  });
});

function notificationPorts(attempts: NotificationDeliveryAttempt[]) {
  return {
    async findIntentById(id: string) {
      return id === intent.id ? intent : null;
    },
    async recordDeliveryAttempt(command: Omit<NotificationDeliveryAttempt, 'id' | 'createdAt'>) {
      attempts.push({
        id: 'attempt-' + (attempts.length + 1),
        createdAt: '2026-09-22T10:05:00.000Z',
        ...command,
      });
    },
  };
}

function makeJob(input: { attemptCount?: number; maxAttempts?: number } = {}): WorkerJob {
  return {
    id: 'job-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: 'NOTIFICATION_DELIVERY',
    status: 'RUNNING',
    schemaVersion: 1,
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'notification-1',
    notificationIntentId: 'notification-1',
    payload: { notificationIntentId: 'notification-1' },
    idempotencyKey: 'notification-1:delivery-job',
    correlationId: 'correlation-1',
    priority: 80,
    attemptCount: input.attemptCount ?? 0,
    maxAttempts: input.maxAttempts ?? 5,
    runAt: '2026-09-22T10:00:00.000Z',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  };
}
