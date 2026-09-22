import type {
  CreateNotificationIntentCommand,
  NotificationDeliveryAttempt,
  NotificationIntent,
  RecordNotificationDeliveryAttemptCommand,
  RequestContext,
} from '@barberos/contracts';
import { describe, expect, it } from 'vitest';

import { NotificationApplicationService } from './notification-service';
import type {
  NotificationDeliveryAttemptFilters,
  NotificationIntentFilters,
  NotificationRepository,
} from '../domain';

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

describe('NotificationApplicationService', () => {
  it('creates provider-agnostic notification intents idempotently', async () => {
    const repository = new MemoryNotificationRepository();
    const service = new NotificationApplicationService(repository);
    const command: CreateNotificationIntentCommand = {
      tenantId: intent.tenantId,
      branchId: intent.branchId,
      recipientType: intent.recipientType,
      recipientId: intent.recipientId,
      channel: intent.channel,
      templateKey: intent.templateKey,
      sourceType: intent.sourceType,
      sourceId: intent.sourceId,
      payload: intent.payload,
      idempotencyKey: intent.idempotencyKey,
      correlationId: intent.correlationId,
    };

    const created = await service.createIntent(context, command);
    const duplicate = await service.createIntent(context, command);

    expect(created).toMatchObject({ idempotencyKey: intent.idempotencyKey, status: 'PENDING' });
    expect(duplicate).toEqual(created);
    expect(repository.intents).toHaveLength(1);
  });

  it('records sent, retryable failure and permanent failure attempts', async () => {
    const retryIntent = { ...intent, id: 'notification-retry', status: 'PENDING' as const };
    const permanentIntent = { ...intent, id: 'notification-permanent', status: 'PENDING' as const };
    const repository = new MemoryNotificationRepository([intent, retryIntent, permanentIntent]);
    const service = new NotificationApplicationService(repository);

    const sent = await service.recordDeliveryAttempt(context, {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      notificationIntentId: 'notification-1',
      channel: 'LOCAL',
      status: 'SENT',
      attemptNumber: 1,
      provider: 'local-noop',
      providerMessageId: 'local-message-1',
      sentAt: '2026-09-22T10:01:00.000Z',
    });
    const retryable = await service.recordDeliveryAttempt(context, {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      notificationIntentId: 'notification-retry',
      channel: 'LOCAL',
      status: 'RETRY_SCHEDULED',
      attemptNumber: 2,
      provider: 'local-noop',
      error: {
        code: 'WORKER_PROVIDER_UNAVAILABLE',
        message: 'Provider unavailable.',
        retryable: true,
      },
    });
    const permanent = await service.recordDeliveryAttempt(context, {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      notificationIntentId: 'notification-permanent',
      channel: 'LOCAL',
      status: 'DEAD_LETTERED',
      attemptNumber: 3,
      provider: 'local-noop',
      error: { code: 'WORKER_RETRY_EXHAUSTED', message: 'Retry exhausted.', retryable: false },
    });

    expect(sent.status).toBe('SENT');
    expect(retryable.status).toBe('RETRY_SCHEDULED');
    expect(permanent.status).toBe('DEAD_LETTERED');
    expect(repository.intents.find((candidate) => candidate.id === 'notification-1')?.status).toBe(
      'SENT',
    );
    expect(
      repository.intents.find((candidate) => candidate.id === 'notification-retry')?.status,
    ).toBe('PENDING');
    expect(
      repository.intents.find((candidate) => candidate.id === 'notification-permanent')?.status,
    ).toBe('FAILED');
    expect(repository.attempts.map((attempt) => attempt.status)).toEqual([
      'SENT',
      'RETRY_SCHEDULED',
      'DEAD_LETTERED',
    ]);
  });

  it('rejects delivery attempts outside tenant, branch or intent channel scope', async () => {
    const service = new NotificationApplicationService(new MemoryNotificationRepository([intent]));

    await expect(
      service.recordDeliveryAttempt(context, {
        tenantId: 'tenant-2',
        branchId: 'branch-1',
        notificationIntentId: 'notification-1',
        channel: 'LOCAL',
        status: 'SENT',
        attemptNumber: 1,
      }),
    ).rejects.toThrow('Cross-tenant');
    await expect(
      service.recordDeliveryAttempt(context, {
        tenantId: 'tenant-1',
        branchId: 'branch-2',
        notificationIntentId: 'notification-1',
        channel: 'LOCAL',
        status: 'SENT',
        attemptNumber: 1,
      }),
    ).rejects.toThrow('outside request scope');
    await expect(
      service.recordDeliveryAttempt(context, {
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        notificationIntentId: 'notification-1',
        channel: 'WHATSAPP',
        status: 'SENT',
        attemptNumber: 1,
      }),
    ).rejects.toThrow('Notification channel does not match');
  });
});

class MemoryNotificationRepository implements NotificationRepository {
  readonly intents: NotificationIntent[];
  readonly attempts: NotificationDeliveryAttempt[] = [];

  constructor(intents: readonly NotificationIntent[] = []) {
    this.intents = [...intents];
  }

  async createIntent(_context: RequestContext, command: CreateNotificationIntentCommand) {
    const created: NotificationIntent = {
      id: 'notification-' + (this.intents.length + 1),
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
    this.intents.push(created);
    return created;
  }

  async findIntentById(_context: RequestContext, intentId: string) {
    return this.intents.find((candidate) => candidate.id === intentId) ?? null;
  }

  async findIntentByIdempotencyKey(_context: RequestContext, idempotencyKey: string) {
    return this.intents.find((candidate) => candidate.idempotencyKey === idempotencyKey) ?? null;
  }

  async listIntents(_context: RequestContext, _filters?: NotificationIntentFilters) {
    return this.intents;
  }

  async recordDeliveryAttempt(
    _context: RequestContext,
    command: RecordNotificationDeliveryAttemptCommand,
  ) {
    const attempt: NotificationDeliveryAttempt = {
      id: 'attempt-' + (this.attempts.length + 1),
      tenantId: command.tenantId,
      branchId: command.branchId,
      notificationIntentId: command.notificationIntentId,
      channel: command.channel,
      status: command.status,
      attemptNumber: command.attemptNumber,
      provider: command.provider,
      providerMessageId: command.providerMessageId,
      error: command.error
        ? { ...command.error, retryable: command.error.retryable ?? false }
        : undefined,
      sentAt: command.sentAt,
      createdAt: '2026-09-22T10:02:00.000Z',
    };
    this.attempts.push(attempt);
    const intent = this.intents.find((candidate) => candidate.id === command.notificationIntentId);
    if (intent) {
      intent.status =
        command.status === 'SENT'
          ? 'SENT'
          : command.status === 'DEAD_LETTERED' || command.status === 'FAILED'
            ? 'FAILED'
            : intent.status;
    }
    return attempt;
  }

  async listDeliveryAttempts(
    _context: RequestContext,
    filters: NotificationDeliveryAttemptFilters = {},
  ) {
    return this.attempts.filter(
      (attempt) =>
        (!filters.notificationIntentId ||
          attempt.notificationIntentId === filters.notificationIntentId) &&
        (!filters.channel || attempt.channel === filters.channel) &&
        (!filters.status || attempt.status === filters.status),
    );
  }
}
