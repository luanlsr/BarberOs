import type {
  CreateNotificationIntentCommand,
  CreateWorkerJobCommand,
  NotificationDeliveryAttempt,
  NotificationIntent,
  RecordNotificationDeliveryAttemptCommand,
  OutboxEvent,
  WorkerJob,
} from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import {
  handleNotificationDelivery,
  LocalNoopNotificationProvider,
} from './notification-delivery-handler';
import { OutboxDispatcher } from './outbox-dispatcher';
import { handlePostServiceFollowUp } from './initial-handlers';

describe('worker notification integration flow', () => {
  it('runs order paid outbox follow-up through a succeeded local notification delivery', async () => {
    const store = new MemoryWorkerStore();
    const dispatcher = new OutboxDispatcher(store);
    const orderPaidEvent = makeOutboxEvent({
      id: 'outbox-order-paid',
      eventType: 'ORDER_PAID',
      sourceType: 'ORDER',
      sourceId: 'order-1',
    });

    const dispatched = await dispatcher.dispatch(
      orderPaidEvent,
      new Date('2026-09-22T10:00:00.000Z'),
    );
    const followUpJob = dispatched.jobs.find((job) => job.type === 'POST_SERVICE_FOLLOW_UP');
    expect(followUpJob).toBeDefined();

    const intents: NotificationIntent[] = [];
    const followUpResult = await handlePostServiceFollowUp(followUpJob!, {
      orders: {
        async findById(id) {
          return {
            id,
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            status: 'PAID',
            customerId: 'customer-1',
          };
        },
      },
      notifications: {
        async createIntent(command) {
          intents.push(toIntent(command, 'notification-1'));
        },
      },
    });
    expect(followUpResult).toEqual({ status: 'succeeded', effect: 'notification_intent_created' });

    const notificationEvent = makeOutboxEvent({
      id: 'outbox-notification-delivery',
      eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
      sourceType: 'NOTIFICATION_INTENT',
      sourceId: intents[0]!.id,
    });
    const notificationDispatched = await dispatcher.dispatch(
      notificationEvent,
      new Date('2026-09-22T10:01:00.000Z'),
    );
    const deliveryJob = notificationDispatched.jobs[0]!;
    const attempts: NotificationDeliveryAttempt[] = [];
    const deliveryResult = await handleNotificationDelivery(deliveryJob, {
      notifications: {
        async findIntentById(id) {
          return intents.find((intent) => intent.id === id) ?? null;
        },
        async recordDeliveryAttempt(command) {
          attempts.push(toAttempt(command, 'attempt-1'));
        },
      },
      provider: new LocalNoopNotificationProvider(),
      now: () => new Date('2026-09-22T10:02:00.000Z'),
    });

    expect(deliveryJob).toMatchObject({
      type: 'NOTIFICATION_DELIVERY',
      notificationIntentId: 'notification-1',
    });
    expect(deliveryResult).toEqual({ status: 'succeeded', effect: 'notification_delivered' });
    expect(attempts[0]).toMatchObject({
      status: 'SENT',
      provider: 'local-noop',
      notificationIntentId: 'notification-1',
    });
  });

  it('moves appointment reminder notification delivery to dead-letter after provider failures', async () => {
    const intent = toIntent(
      {
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        recipientType: 'CUSTOMER',
        recipientId: 'customer-1',
        channel: 'LOCAL',
        templateKey: 'appointment.reminder.v1',
        sourceType: 'APPOINTMENT',
        sourceId: 'appointment-1',
        payload: { appointmentId: 'appointment-1' },
        idempotencyKey: 'appointment-1:notification',
        correlationId: 'correlation-appointment',
      },
      'notification-reminder',
    );
    const attempts: NotificationDeliveryAttempt[] = [];

    const result = await handleNotificationDelivery(
      makeJob({ attemptCount: 7, maxAttempts: 8, notificationIntentId: intent.id }),
      {
        notifications: {
          async findIntentById(id) {
            return id === intent.id ? intent : null;
          },
          async recordDeliveryAttempt(command) {
            attempts.push(toAttempt(command, 'attempt-dead-letter'));
          },
        },
        provider: new LocalNoopNotificationProvider({ mode: 'retryable_failure' }),
        now: () => new Date('2026-09-22T10:05:00.000Z'),
      },
    );

    expect(result).toEqual({ status: 'skipped', reason: 'notification_delivery_failed' });
    expect(attempts[0]).toMatchObject({
      notificationIntentId: 'notification-reminder',
      status: 'DEAD_LETTERED',
      error: { code: 'WORKER_RETRY_EXHAUSTED', retryable: false },
    });
  });
});

class MemoryWorkerStore {
  readonly jobs: WorkerJob[] = [];
  async findJobByIdempotencyKey(idempotencyKey: string) {
    return this.jobs.find((job) => job.idempotencyKey === idempotencyKey) ?? null;
  }
  async createJob(command: CreateWorkerJobCommand) {
    const job: WorkerJob = {
      id: 'job-' + (this.jobs.length + 1),
      tenantId: command.tenantId,
      branchId: command.branchId,
      type: command.type,
      status: 'PENDING',
      schemaVersion: command.schemaVersion ?? 1,
      sourceType: command.sourceType,
      sourceId: command.sourceId,
      outboxEventId: command.outboxEventId,
      notificationIntentId: command.notificationIntentId,
      payload: command.payload ?? {},
      idempotencyKey: command.idempotencyKey,
      correlationId: command.correlationId,
      priority: command.priority ?? 50,
      attemptCount: 0,
      maxAttempts: command.maxAttempts ?? 5,
      runAt: command.runAt ?? '2026-09-22T10:00:00.000Z',
      createdAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-22T10:00:00.000Z',
    };
    this.jobs.push(job);
    return job;
  }
  async markEventDispatched() {}
}

function makeOutboxEvent(
  input: Pick<OutboxEvent, 'id' | 'eventType' | 'sourceType' | 'sourceId'>,
): OutboxEvent {
  return {
    ...input,
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    payload: {},
    idempotencyKey: input.id + ':event',
    status: 'PENDING',
    correlationId: 'correlation-1',
    schemaVersion: 1,
    attemptCount: 0,
    availableAt: '2026-09-22T10:00:00.000Z',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  };
}

function toIntent(command: CreateNotificationIntentCommand, id: string): NotificationIntent {
  return {
    id,
    tenantId: command.tenantId,
    branchId: command.branchId,
    recipientType: command.recipientType,
    recipientId: command.recipientId,
    channel: command.channel,
    templateKey: command.templateKey,
    sourceType: command.sourceType,
    sourceId: command.sourceId,
    payload: command.payload ?? {},
    status: 'PENDING',
    idempotencyKey: command.idempotencyKey,
    correlationId: command.correlationId,
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  };
}

function toAttempt(
  command: RecordNotificationDeliveryAttemptCommand,
  id: string,
): NotificationDeliveryAttempt {
  return {
    id,
    createdAt: '2026-09-22T10:02:00.000Z',
    ...command,
    error: command.error
      ? { ...command.error, retryable: command.error.retryable ?? false }
      : undefined,
  };
}

function makeJob(input: {
  attemptCount: number;
  maxAttempts: number;
  notificationIntentId: string;
}): WorkerJob {
  return {
    id: 'job-notification-reminder',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: 'NOTIFICATION_DELIVERY',
    status: 'RUNNING',
    schemaVersion: 1,
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: input.notificationIntentId,
    notificationIntentId: input.notificationIntentId,
    payload: { notificationIntentId: input.notificationIntentId },
    idempotencyKey: input.notificationIntentId + ':delivery',
    correlationId: 'correlation-appointment',
    priority: 80,
    attemptCount: input.attemptCount,
    maxAttempts: input.maxAttempts,
    runAt: '2026-09-22T10:00:00.000Z',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  };
}
