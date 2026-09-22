import type {
  NotificationDeliveryAttemptStatus,
  NotificationIntent,
  RecordNotificationDeliveryAttemptCommand,
  WorkerJob,
  WorkerSanitizedError,
} from '@barberos/contracts';

import { decideWorkerJobFailure } from './job-retry-policy';
import type { WorkerJobHandlerResult } from './initial-handlers';

export type NotificationProviderDeliveryInput = {
  intent: NotificationIntent;
  job: WorkerJob;
};

export type NotificationProviderDeliveryResult =
  | {
      status: 'sent';
      providerMessageId?: string;
      sentAt?: string;
    }
  | {
      status: 'failed';
      error: WorkerSanitizedError;
      retryAfterMs?: number;
    };

export type NotificationProviderAdapter = {
  provider: string;
  deliver(input: NotificationProviderDeliveryInput): Promise<NotificationProviderDeliveryResult>;
};

export type NotificationDeliveryPorts = {
  notifications: {
    findIntentById(id: string): Promise<NotificationIntent | null>;
    recordDeliveryAttempt(command: RecordNotificationDeliveryAttemptCommand): Promise<unknown>;
  };
  provider: NotificationProviderAdapter;
  now?: () => Date;
};

export async function handleNotificationDelivery(
  job: WorkerJob,
  ports: NotificationDeliveryPorts,
): Promise<WorkerJobHandlerResult> {
  const intentId = job.notificationIntentId ?? job.sourceId;
  if (!intentId) return { status: 'skipped', reason: 'notification_intent_missing' };

  const intent = await ports.notifications.findIntentById(intentId);
  if (!intent || intent.tenantId !== job.tenantId) {
    return { status: 'skipped', reason: 'notification_intent_not_found' };
  }
  if (intent.status === 'SENT' || intent.status === 'CANCELLED') {
    return { status: 'skipped', reason: 'notification_intent_not_deliverable' };
  }

  const now = ports.now?.() ?? new Date();
  const providerResult = await ports.provider.deliver({ intent, job });
  if (providerResult.status === 'sent') {
    await ports.notifications.recordDeliveryAttempt({
      tenantId: job.tenantId,
      branchId: intent.branchId ?? job.branchId,
      notificationIntentId: intent.id,
      channel: intent.channel,
      status: 'SENT',
      attemptNumber: job.attemptCount + 1,
      provider: ports.provider.provider,
      providerMessageId: providerResult.providerMessageId,
      sentAt: providerResult.sentAt ?? now.toISOString(),
    });
    return { status: 'succeeded', effect: 'notification_delivered' };
  }

  const decision = decideWorkerJobFailure({
    job,
    error: providerResult.error,
    now,
    retryAfterMs: providerResult.retryAfterMs,
  });
  if (
    decision.attemptStatus !== 'RETRY_SCHEDULED' &&
    decision.attemptStatus !== 'DEAD_LETTERED' &&
    decision.attemptStatus !== 'FAILED'
  ) {
    throw new Error('Notification delivery failure produced an invalid attempt status.');
  }

  await ports.notifications.recordDeliveryAttempt({
    tenantId: job.tenantId,
    branchId: intent.branchId ?? job.branchId,
    notificationIntentId: intent.id,
    channel: intent.channel,
    status: notificationAttemptStatusFromJobDecision(decision.attemptStatus),
    attemptNumber: decision.attemptCount,
    provider: ports.provider.provider,
    error: decision.lastError,
  });

  return {
    status: 'skipped',
    reason:
      decision.attemptStatus === 'RETRY_SCHEDULED'
        ? 'notification_delivery_retry_scheduled'
        : 'notification_delivery_failed',
  };
}

export class LocalNoopNotificationProvider implements NotificationProviderAdapter {
  readonly provider = 'local-noop';

  constructor(
    private readonly options: {
      mode?: 'sent' | 'retryable_failure' | 'permanent_failure' | 'rate_limited';
      retryAfterMs?: number;
    } = {},
  ) {}

  async deliver(
    input: NotificationProviderDeliveryInput,
  ): Promise<NotificationProviderDeliveryResult> {
    const mode = this.options.mode ?? 'sent';
    if (mode === 'sent') {
      return {
        status: 'sent',
        providerMessageId: `local:${input.intent.id}:${input.job.id}`,
      };
    }
    if (mode === 'rate_limited') {
      return {
        status: 'failed',
        retryAfterMs: this.options.retryAfterMs,
        error: {
          code: 'WORKER_RATE_LIMITED',
          message: 'Local notification provider rate limited delivery.',
          retryable: true,
        },
      };
    }
    if (mode === 'retryable_failure') {
      return {
        status: 'failed',
        error: {
          code: 'WORKER_PROVIDER_UNAVAILABLE',
          message: 'Local notification provider is unavailable.',
          retryable: true,
        },
      };
    }
    return {
      status: 'failed',
      error: {
        code: 'NOTIFICATION_DELIVERY_FAILED',
        message: 'Local notification provider rejected delivery.',
        retryable: false,
      },
    };
  }
}

function notificationAttemptStatusFromJobDecision(
  status: 'FAILED' | 'RETRY_SCHEDULED' | 'DEAD_LETTERED',
): NotificationDeliveryAttemptStatus {
  if (status === 'RETRY_SCHEDULED') return 'RETRY_SCHEDULED';
  if (status === 'DEAD_LETTERED') return 'DEAD_LETTERED';
  return 'FAILED';
}
