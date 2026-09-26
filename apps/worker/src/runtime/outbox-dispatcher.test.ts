import type { CreateWorkerJobCommand, OutboxEvent, WorkerJob } from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import {
  createOutboxJobIdempotencyKey,
  createWorkerJobsForOutboxEvent,
  OutboxDispatcher,
  type OutboxDispatchStore,
} from './outbox-dispatcher';

describe('OutboxDispatcher', () => {
  it('dispatches one appointment event into one reminder job without duplicates', async () => {
    const event = makeEvent({ eventType: 'APPOINTMENT_CONFIRMED', sourceType: 'APPOINTMENT' });
    const store = new InMemoryOutboxDispatchStore();
    const dispatcher = new OutboxDispatcher(store);

    const first = await dispatcher.dispatch(event, new Date('2026-09-19T12:00:00.000Z'));
    const second = await dispatcher.dispatch(event, new Date('2026-09-19T12:05:00.000Z'));

    expect(first.jobs).toHaveLength(1);
    expect(first.jobs[0]).toMatchObject({
      type: 'APPOINTMENT_REMINDER',
      outboxEventId: event.id,
      idempotencyKey: createOutboxJobIdempotencyKey(event, 'APPOINTMENT_REMINDER'),
    });
    expect(second.jobs).toEqual(first.jobs);
    expect(store.createdCommands).toHaveLength(1);
    expect(store.dispatchedEvents).toEqual([event.id, event.id]);
  });

  it('dispatches order paid into follow-up and finance recalculation jobs once', async () => {
    const event = makeEvent({ eventType: 'ORDER_PAID', sourceType: 'ORDER' });
    const store = new InMemoryOutboxDispatchStore();
    const dispatcher = new OutboxDispatcher(store);

    const first = await dispatcher.dispatch(event, new Date('2026-09-19T12:00:00.000Z'));
    const second = await dispatcher.dispatch(event, new Date('2026-09-19T12:01:00.000Z'));

    expect(first.jobs.map((job) => job.type)).toEqual([
      'POST_SERVICE_FOLLOW_UP',
      'FINANCE_RECALCULATION',
    ]);
    expect(second.jobs.map((job) => job.id)).toEqual(first.jobs.map((job) => job.id));
    expect(store.createdCommands).toHaveLength(2);
    expect(new Set(store.createdCommands.map((command) => command.idempotencyKey)).size).toBe(2);
  });

  it('uses minimal payloads and links notification delivery jobs to notification intents', () => {
    const event = makeEvent({
      eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
      sourceType: 'NOTIFICATION_INTENT',
    });

    expect(createWorkerJobsForOutboxEvent(event, '2026-09-19T12:00:00.000Z')).toEqual([
      expect.objectContaining({
        type: 'NOTIFICATION_DELIVERY',
        notificationIntentId: event.sourceId,
        payload: {
          outboxEventId: event.id,
          eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
          sourceType: 'NOTIFICATION_INTENT',
          sourceId: event.sourceId,
        },
      }),
    ]);
  });

  it('dispatches messaging and campaign events into dedicated worker jobs', () => {
    const delivery = makeEvent({
      eventType: 'MESSAGING_DELIVERY_REQUESTED',
      sourceType: 'MESSAGING_MESSAGE',
    });
    const webhook = makeEvent({
      eventType: 'MESSAGING_PROVIDER_EVENT_RECEIVED',
      sourceType: 'MESSAGING_PROVIDER_EVENT',
    });
    const campaign = makeEvent({
      eventType: 'CAMPAIGN_DISPATCH_REQUESTED',
      sourceType: 'CAMPAIGN_RUN',
    });

    expect(createWorkerJobsForOutboxEvent(delivery, '2026-09-19T12:00:00.000Z')).toEqual([
      expect.objectContaining({ type: 'WHATSAPP_DELIVERY', priority: 85, maxAttempts: 8 }),
    ]);
    expect(createWorkerJobsForOutboxEvent(webhook, '2026-09-19T12:00:00.000Z')).toEqual([
      expect.objectContaining({
        type: 'MESSAGING_WEBHOOK_PROCESSING',
        priority: 85,
        maxAttempts: 8,
      }),
    ]);
    expect(createWorkerJobsForOutboxEvent(campaign, '2026-09-19T12:00:00.000Z')).toEqual([
      expect.objectContaining({ type: 'CAMPAIGN_DISPATCH', priority: 70, maxAttempts: 10 }),
    ]);
  });
});

class InMemoryOutboxDispatchStore implements OutboxDispatchStore {
  readonly jobs = new Map<string, WorkerJob>();
  readonly createdCommands: CreateWorkerJobCommand[] = [];
  readonly dispatchedEvents: string[] = [];

  async findJobByIdempotencyKey(idempotencyKey: string) {
    return this.jobs.get(idempotencyKey) ?? null;
  }

  async createJob(command: CreateWorkerJobCommand) {
    this.createdCommands.push(command);
    const now = command.runAt ?? '2026-09-19T12:00:00.000Z';
    const job: WorkerJob = {
      id: `job-${this.jobs.size + 1}`,
      tenantId: command.tenantId,
      branchId: command.branchId,
      type: command.type,
      status: 'PENDING',
      schemaVersion: 1,
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
      runAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(command.idempotencyKey, job);
    return job;
  }

  async markEventDispatched(event: OutboxEvent) {
    this.dispatchedEvents.push(event.id);
  }
}

function makeEvent(input: {
  eventType: OutboxEvent['eventType'];
  sourceType: OutboxEvent['sourceType'];
}): OutboxEvent {
  return {
    id: `event-${input.eventType.toLowerCase()}`,
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    eventType: input.eventType,
    sourceType: input.sourceType,
    sourceId: `source-${input.eventType.toLowerCase()}`,
    payload: {},
    idempotencyKey: `event:${input.eventType.toLowerCase()}`,
    status: 'PENDING',
    correlationId: `correlation-${input.eventType.toLowerCase()}`,
    schemaVersion: 1,
    attemptCount: 0,
    availableAt: '2026-09-19T12:00:00.000Z',
    createdAt: '2026-09-19T12:00:00.000Z',
    updatedAt: '2026-09-19T12:00:00.000Z',
  };
}
