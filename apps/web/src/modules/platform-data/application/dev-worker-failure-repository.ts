import type {
  CreateNotificationIntentCommand,
  CreateOutboxEventCommand,
  CreateWorkerJobCommand,
  NotificationDeliveryAttempt,
  NotificationIntent,
  OutboxEvent,
  RequestContext,
  WorkerJob,
  WorkerJobAttempt,
} from '@barberos/contracts';

import type {
  NotificationDeliveryAttemptFilters,
  NotificationIntentFilters,
} from '../../notifications/domain';
import type {
  OutboxEventFilters,
  OutboxRepository,
  WorkerJobClaimInput,
  WorkerJobFilters,
  WorkerJobRepository,
} from '../../outbox/domain';

const outboxEvents: readonly OutboxEvent[] = [
  {
    id: 'dev-outbox-order-paid',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    eventType: 'ORDER_PAID',
    sourceType: 'ORDER',
    sourceId: 'dev-order-1002',
    payload: { orderId: 'dev-order-1002' },
    idempotencyKey: 'dev-order-1002:order-paid',
    status: 'PENDING',
    correlationId: 'worker-correlation-order-paid',
    schemaVersion: 1,
    attemptCount: 0,
    availableAt: '2026-09-22T10:00:00.000Z',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'dev-outbox-notification-dead',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    eventType: 'NOTIFICATION_DELIVERY_REQUESTED',
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'dev-notification-failed',
    payload: { notificationIntentId: 'dev-notification-failed', secret: 'not-for-api' },
    idempotencyKey: 'dev-notification-failed:delivery',
    status: 'DEAD_LETTERED',
    correlationId: 'worker-correlation-notification-failed',
    schemaVersion: 1,
    attemptCount: 5,
    availableAt: '2026-09-22T09:30:00.000Z',
    lastError: {
      code: 'WORKER_RETRY_EXHAUSTED',
      message: 'Limite de tentativas atingido para entrega local.',
      retryable: false,
    },
    createdAt: '2026-09-22T09:30:00.000Z',
    updatedAt: '2026-09-22T10:20:00.000Z',
  },
];

const workerJobs: readonly WorkerJob[] = [
  {
    id: 'dev-job-notification-retry',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    type: 'NOTIFICATION_DELIVERY',
    status: 'RETRY_SCHEDULED',
    schemaVersion: 1,
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'dev-notification-failed',
    outboxEventId: 'dev-outbox-notification-dead',
    notificationIntentId: 'dev-notification-failed',
    payload: { notificationIntentId: 'dev-notification-failed', secret: 'not-for-api' },
    idempotencyKey: 'dev-notification-failed:delivery-job',
    correlationId: 'worker-correlation-notification-failed',
    priority: 90,
    attemptCount: 2,
    maxAttempts: 5,
    runAt: '2026-09-22T13:30:00.000Z',
    lastError: {
      code: 'WORKER_PROVIDER_UNAVAILABLE',
      message: 'Provider local indisponível.',
      retryable: true,
    },
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:35:00.000Z',
  },
  {
    id: 'dev-job-finance-dead',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    type: 'FINANCE_RECALCULATION',
    status: 'DEAD_LETTERED',
    schemaVersion: 1,
    sourceType: 'PAYMENT',
    sourceId: 'dev-payment-1001',
    payload: { paymentId: 'dev-payment-1001', secret: 'not-for-api' },
    idempotencyKey: 'dev-payment-1001:finance-recalc',
    correlationId: 'worker-correlation-finance-dead',
    priority: 70,
    attemptCount: 5,
    maxAttempts: 5,
    runAt: '2026-09-22T10:30:00.000Z',
    lastError: {
      code: 'WORKER_RETRY_EXHAUSTED',
      message: 'Recalculo financeiro excedeu tentativas.',
      retryable: false,
    },
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T11:05:00.000Z',
  },
];

const notificationIntents: readonly NotificationIntent[] = [
  {
    id: 'dev-notification-pending',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    recipientType: 'CUSTOMER',
    recipientId: 'dev-customer-301',
    channel: 'LOCAL',
    templateKey: 'appointment.reminder.v1',
    sourceType: 'APPOINTMENT',
    sourceId: 'dev-appointment-401',
    payload: { appointmentId: 'dev-appointment-401', secret: 'not-for-api' },
    status: 'PENDING',
    idempotencyKey: 'dev-appointment-401:notification',
    correlationId: 'worker-correlation-reminder',
    createdAt: '2026-09-22T10:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'dev-notification-failed',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    recipientType: 'CUSTOMER',
    recipientId: 'dev-customer-303',
    channel: 'LOCAL',
    templateKey: 'post-service.follow-up.v1',
    sourceType: 'ORDER',
    sourceId: 'dev-order-1002',
    payload: { orderId: 'dev-order-1002', secret: 'not-for-api' },
    status: 'FAILED',
    idempotencyKey: 'dev-order-1002:follow-up',
    correlationId: 'worker-correlation-notification-failed',
    createdAt: '2026-09-22T09:30:00.000Z',
    updatedAt: '2026-09-22T10:20:00.000Z',
  },
];

const deliveryAttempts: readonly NotificationDeliveryAttempt[] = [
  {
    id: 'dev-delivery-failed-1',
    tenantId: 'dev-tenant',
    branchId: 'dev-branch',
    notificationIntentId: 'dev-notification-failed',
    channel: 'LOCAL',
    status: 'FAILED',
    attemptNumber: 2,
    provider: 'local-noop',
    error: {
      code: 'WORKER_PROVIDER_UNAVAILABLE',
      message: 'Provider local indisponível.',
      retryable: true,
    },
    createdAt: '2026-09-22T10:20:00.000Z',
  },
];

export class DevWorkerFailureRepository implements OutboxRepository, WorkerJobRepository {
  async createEvent(
    _context: RequestContext,
    _command: CreateOutboxEventCommand,
  ): Promise<OutboxEvent> {
    throw new Error('Development worker failure repository is read-only.');
  }

  async findEventById(context: RequestContext, eventId: string) {
    return scoped(outboxEvents, context).find((event) => event.id === eventId) ?? null;
  }

  async findEventByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    return (
      scoped(outboxEvents, context).find((event) => event.idempotencyKey === idempotencyKey) ?? null
    );
  }

  async listEvents(context: RequestContext, filters: OutboxEventFilters = {}) {
    return applyLimit(
      scoped(outboxEvents, context, filters.branchId).filter(
        (event) =>
          (!filters.status || event.status === filters.status) &&
          (!filters.sourceType || event.sourceType === filters.sourceType) &&
          (!filters.sourceId || event.sourceId === filters.sourceId),
      ),
      filters.limit,
    );
  }

  async createJob(_context: RequestContext, _command: CreateWorkerJobCommand): Promise<WorkerJob> {
    throw new Error('Development worker failure repository is read-only.');
  }

  async findJobById(context: RequestContext, jobId: string) {
    return scoped(workerJobs, context).find((job) => job.id === jobId) ?? null;
  }

  async findJobByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    return scoped(workerJobs, context).find((job) => job.idempotencyKey === idempotencyKey) ?? null;
  }

  async listJobs(context: RequestContext, filters: WorkerJobFilters = {}) {
    return applyLimit(
      scoped(workerJobs, context, filters.branchId).filter(
        (job) =>
          (!filters.status || job.status === filters.status) &&
          (!filters.type || job.type === filters.type) &&
          (!filters.sourceType || job.sourceType === filters.sourceType) &&
          (!filters.sourceId || job.sourceId === filters.sourceId),
      ),
      filters.limit,
    );
  }

  async claimAvailableJobs(_input: WorkerJobClaimInput) {
    return [];
  }

  async listJobAttempts(_context: RequestContext, _jobId: string): Promise<WorkerJobAttempt[]> {
    return [];
  }

  async createIntent(
    _context: RequestContext,
    _command: CreateNotificationIntentCommand,
  ): Promise<NotificationIntent> {
    throw new Error('Development worker failure repository is read-only.');
  }

  async findIntentById(context: RequestContext, intentId: string) {
    return scoped(notificationIntents, context).find((intent) => intent.id === intentId) ?? null;
  }

  async findIntentByIdempotencyKey(context: RequestContext, idempotencyKey: string) {
    return (
      scoped(notificationIntents, context).find(
        (intent) => intent.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async listIntents(context: RequestContext, filters: NotificationIntentFilters = {}) {
    return applyLimit(
      scoped(notificationIntents, context, filters.branchId).filter(
        (intent) =>
          (!filters.status || intent.status === filters.status) &&
          (!filters.channel || intent.channel === filters.channel) &&
          (!filters.sourceType || intent.sourceType === filters.sourceType) &&
          (!filters.sourceId || intent.sourceId === filters.sourceId) &&
          (!filters.recipientType || intent.recipientType === filters.recipientType) &&
          (!filters.recipientId || intent.recipientId === filters.recipientId),
      ),
      filters.limit,
    );
  }

  async recordDeliveryAttempt(): Promise<NotificationDeliveryAttempt> {
    throw new Error('Development worker failure repository is read-only.');
  }

  async listDeliveryAttempts(
    context: RequestContext,
    filters: NotificationDeliveryAttemptFilters = {},
  ) {
    return applyLimit(
      scoped(deliveryAttempts, context, filters.branchId).filter(
        (attempt) =>
          (!filters.notificationIntentId ||
            attempt.notificationIntentId === filters.notificationIntentId) &&
          (!filters.status || attempt.status === filters.status) &&
          (!filters.channel || attempt.channel === filters.channel),
      ),
      filters.limit,
    );
  }
}

function scoped<T extends { tenantId: string; branchId?: string }>(
  records: readonly T[],
  context: RequestContext,
  branchId?: string,
) {
  if (branchId && !context.branchScope.includes(branchId)) return [];
  return records.filter(
    (record) =>
      record.tenantId === context.tenantId &&
      (!record.branchId ||
        (branchId ? record.branchId === branchId : context.branchScope.includes(record.branchId))),
  );
}

function applyLimit<T>(records: readonly T[], limit = 100) {
  return records.slice(0, Math.max(1, limit));
}
