import type {
  CreateWorkerJobCommand,
  OutboxEvent,
  WorkerJob,
  WorkerJobType,
} from '@barberos/contracts';

export type OutboxDispatchStore = {
  findJobByIdempotencyKey(idempotencyKey: string): Promise<WorkerJob | null>;
  createJob(command: CreateWorkerJobCommand): Promise<WorkerJob>;
  markEventDispatched(event: OutboxEvent, dispatchedAt: string): Promise<void>;
};

export type OutboxDispatchResult = {
  eventId: string;
  jobs: WorkerJob[];
};

export class OutboxDispatcher {
  constructor(private readonly store: OutboxDispatchStore) {}

  async dispatch(event: OutboxEvent, now = new Date()): Promise<OutboxDispatchResult> {
    const commands = createWorkerJobsForOutboxEvent(event, now.toISOString());
    const jobs: WorkerJob[] = [];

    for (const command of commands) {
      const existing = await this.store.findJobByIdempotencyKey(command.idempotencyKey);
      if (existing) {
        jobs.push(existing);
        continue;
      }
      jobs.push(await this.store.createJob(command));
    }

    await this.store.markEventDispatched(event, now.toISOString());
    return { eventId: event.id, jobs };
  }
}

export function createWorkerJobsForOutboxEvent(
  event: OutboxEvent,
  runAt: string,
): CreateWorkerJobCommand[] {
  return getJobTypesForEvent(event).map((type) => ({
    tenantId: event.tenantId,
    branchId: event.branchId,
    type,
    schemaVersion: 1,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    outboxEventId: event.id,
    notificationIntentId:
      type === 'NOTIFICATION_DELIVERY' && event.sourceType === 'NOTIFICATION_INTENT'
        ? event.sourceId
        : undefined,
    payload: {
      outboxEventId: event.id,
      eventType: event.eventType,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
    },
    idempotencyKey: createOutboxJobIdempotencyKey(event, type),
    correlationId: event.correlationId,
    priority: getJobPriority(type),
    maxAttempts: getJobMaxAttempts(type),
    runAt,
  }));
}

export function createOutboxJobIdempotencyKey(event: OutboxEvent, type: WorkerJobType) {
  return `outbox:${event.id}:${type.toLowerCase().replaceAll('_', '.')}`;
}

function getJobTypesForEvent(event: OutboxEvent): WorkerJobType[] {
  switch (event.eventType) {
    case 'APPOINTMENT_CREATED':
    case 'APPOINTMENT_CONFIRMED':
      return ['APPOINTMENT_REMINDER'];
    case 'APPOINTMENT_CANCELLED':
      return [];
    case 'ORDER_PAID':
      return ['POST_SERVICE_FOLLOW_UP', 'FINANCE_RECALCULATION'];
    case 'PAYMENT_COMPLETED':
    case 'PAYMENT_REFUNDED':
    case 'FINANCE_RECALCULATION_REQUESTED':
      return ['FINANCE_RECALCULATION'];
    case 'STOCK_LOW_DETECTED':
      return ['STOCK_ALERT'];
    case 'NOTIFICATION_DELIVERY_REQUESTED':
      return ['NOTIFICATION_DELIVERY'];
    case 'MESSAGING_DELIVERY_REQUESTED':
      return ['WHATSAPP_DELIVERY'];
    case 'MESSAGING_PROVIDER_EVENT_RECEIVED':
      return ['MESSAGING_WEBHOOK_PROCESSING'];
    case 'CAMPAIGN_DISPATCH_REQUESTED':
      return ['CAMPAIGN_DISPATCH'];
    case 'ORDER_OPENED':
      return [];
  }
}

function getJobPriority(type: WorkerJobType) {
  if (type === 'WHATSAPP_DELIVERY' || type === 'MESSAGING_WEBHOOK_PROCESSING') return 85;
  if (type === 'CAMPAIGN_DISPATCH') return 70;
  if (type === 'NOTIFICATION_DELIVERY' || type === 'APPOINTMENT_REMINDER') return 80;
  if (type === 'STOCK_ALERT') return 60;
  return 50;
}

function getJobMaxAttempts(type: WorkerJobType) {
  if (type === 'WHATSAPP_DELIVERY' || type === 'MESSAGING_WEBHOOK_PROCESSING') return 8;
  if (type === 'CAMPAIGN_DISPATCH') return 10;
  if (type === 'NOTIFICATION_DELIVERY' || type === 'APPOINTMENT_REMINDER') return 8;
  return 5;
}
