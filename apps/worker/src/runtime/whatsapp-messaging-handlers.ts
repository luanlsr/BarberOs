import type {
  MessageDeliveryState,
  NotificationDeliveryAttempt,
  NotificationDeliveryAttemptStatus,
  WorkerJobAttemptStatus,
  RawMessagingProviderEvent,
  RecordNotificationDeliveryAttemptCommand,
  WhatsAppDeliveryPayload,
  WorkerJob,
  WorkerSanitizedError,
} from '@barberos/contracts';
import {
  whatsappDeliveryPayloadSchema,
  whatsappWebhookEventPayloadSchema,
} from '@barberos/contracts';

import { decideWorkerJobFailure } from './job-retry-policy';
import type { WorkerJobHandlerResult } from './initial-handlers';
import type { WorkerLogger } from './worker-logger';
import type { WorkerMetrics } from './worker-metrics';

export type WhatsAppProviderSendResult =
  | {
      accepted: true;
      provider: string;
      providerMessageId?: string;
      deliveryState: MessageDeliveryState;
      retryable: false;
    }
  | {
      accepted: false;
      provider: string;
      deliveryState: MessageDeliveryState;
      retryable: boolean;
      error: WorkerSanitizedError;
      retryAfterMs?: number;
    };

export type WhatsAppProviderAdapter = {
  provider: string;
  send(input: WhatsAppDeliveryPayload): Promise<WhatsAppProviderSendResult>;
};

export type WhatsAppDeliveryEligibilityDecision = {
  allowed: boolean;
  reason?: 'NO_DESTINATION' | 'WHATSAPP_OPTED_OUT' | 'MARKETING_OPTED_OUT' | 'UNKNOWN_CONSENT';
};

export type WhatsAppDeliveryEligibilityInput = {
  tenantId: string;
  branchId?: string;
  connectionId: string;
  notificationIntentId?: string;
  recipientPhoneHash: string;
  templateKey: string;
};

export type WhatsAppDeliveryPorts = {
  provider: WhatsAppProviderAdapter;
  notifications?: {
    findLatestDeliveryAttempt?(
      notificationIntentId: string,
    ): Promise<NotificationDeliveryAttempt | null>;
    recordDeliveryAttempt(command: RecordNotificationDeliveryAttemptCommand): Promise<unknown>;
  };
  eligibility?: {
    evaluateTransactionalDelivery(
      input: WhatsAppDeliveryEligibilityInput,
    ): Promise<WhatsAppDeliveryEligibilityDecision>;
  };
  logger?: WorkerLogger;
  metrics?: WorkerMetrics;
  now?: () => Date;
};

export type ProcessInboundMessageCommand = {
  tenantId: string;
  branchId?: string;
  connectionId: string;
  providerMessageId?: string;
  contactPhoneHash: string;
  bodyPreview?: string;
  rawText?: string;
  receivedAt: string;
  payload: Record<string, unknown>;
};

export type ProcessProviderStatusCommand = {
  tenantId: string;
  branchId?: string;
  connectionId: string;
  providerMessageId: string;
  deliveryState: MessageDeliveryState;
  providerEventId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type WhatsAppWebhookProcessingPorts = {
  messaging: {
    findRawProviderEventById(id: string): Promise<RawMessagingProviderEvent | null>;
    recordInboundMessage(command: ProcessInboundMessageCommand): Promise<unknown>;
    recordProviderStatus(command: ProcessProviderStatusCommand): Promise<unknown>;
    markRawProviderEventProcessed(id: string, processedAt: string): Promise<void>;
  };
  now?: () => Date;
};

export async function handleWhatsAppDelivery(
  job: WorkerJob,
  ports: WhatsAppDeliveryPorts,
): Promise<WorkerJobHandlerResult> {
  const payload = whatsappDeliveryPayloadSchema.parse(job.payload);
  if (payload.tenantId !== job.tenantId) return { status: 'skipped', reason: 'tenant_mismatch' };
  if (payload.branchId && job.branchId && payload.branchId !== job.branchId) {
    return { status: 'skipped', reason: 'branch_mismatch' };
  }

  const now = ports.now?.() ?? new Date();
  const previous = payload.notificationIntentId
    ? await ports.notifications?.findLatestDeliveryAttempt?.(payload.notificationIntentId)
    : null;
  if (previous && isFinalDeliveryAttempt(previous.status)) {
    return workerResultFromDeliveryAttemptStatus(previous.status);
  }

  const eligibility = await ports.eligibility?.evaluateTransactionalDelivery({
    tenantId: payload.tenantId,
    branchId: payload.branchId,
    connectionId: payload.connectionId,
    notificationIntentId: payload.notificationIntentId,
    recipientPhoneHash: payload.recipientPhoneHash,
    templateKey: payload.templateKey,
  });
  if (eligibility && !eligibility.allowed) {
    const status = deliveryAttemptStatusFromEligibilityDecision(eligibility);
    await recordNotificationAttemptIfNeeded(job, ports, payload, {
      status,
      provider: 'whatsapp-eligibility',
      error: {
        code:
          status === 'BLOCKED_BY_CONSENT'
            ? 'MESSAGING_CONSENT_BLOCKED'
            : 'MESSAGING_VALIDATION_ERROR',
        message: 'WhatsApp delivery blocked by current eligibility state.',
        retryable: false,
      },
    });
    return workerResultFromDeliveryAttemptStatus(status);
  }

  const providerSendStartedAt = Date.now();
  const result = await ports.provider.send(payload);
  const providerSendLatencyMs = Date.now() - providerSendStartedAt;
  ports.metrics?.timing({
    name: 'whatsapp_provider_send_latency_ms',
    value: providerSendLatencyMs,
    job,
    tags: {
      provider: result.provider,
      accepted: result.accepted,
      deliveryState: result.deliveryState,
    },
  });

  if (result.accepted) {
    const attemptStatus = notificationAttemptStatusFromDeliveryState(result.deliveryState);
    ports.logger?.info({
      event: 'whatsapp.provider.send.accepted',
      job,
      metadata: {
        provider: result.provider,
        deliveryState: result.deliveryState,
        latencyMs: providerSendLatencyMs,
        hasProviderMessageId: Boolean(result.providerMessageId),
      },
    });
    ports.metrics?.count({
      name: 'whatsapp_provider_send_accepted_total',
      job,
      tags: {
        provider: result.provider,
        deliveryState: result.deliveryState,
      },
    });
    await recordNotificationAttemptIfNeeded(job, ports, payload, {
      status: attemptStatus,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      sentAt: now.toISOString(),
    });
    return workerResultFromDeliveryAttemptStatus(attemptStatus);
  }

  const decision = decideWorkerJobFailure({
    job,
    error: result.error,
    now,
    retryAfterMs: result.retryAfterMs,
  });
  const retryScheduled = decision.attemptStatus === 'RETRY_SCHEDULED';
  const deadLettered = decision.attemptStatus === 'DEAD_LETTERED';

  ports.logger?.[retryScheduled ? 'warn' : 'error']({
    event: retryScheduled
      ? 'whatsapp.provider.send.retry_scheduled'
      : deadLettered
        ? 'whatsapp.provider.send.dead_lettered'
        : 'whatsapp.provider.send.failed',
    job,
    error: decision.lastError,
    metadata: {
      provider: result.provider,
      deliveryState: result.deliveryState,
      latencyMs: providerSendLatencyMs,
      retryAfterMs: result.retryAfterMs,
      runAt: decision.runAt,
      completedAt: decision.completedAt,
    },
  });
  ports.metrics?.count({
    name: retryScheduled
      ? 'worker_job_retries_total'
      : deadLettered
        ? 'worker_job_dead_letters_total'
        : 'whatsapp_provider_send_failed_total',
    job,
    tags: {
      provider: result.provider,
      deliveryState: result.deliveryState,
      reason: decision.lastError.code,
    },
  });

  await recordNotificationAttemptIfNeeded(job, ports, payload, {
    status: notificationAttemptStatusFromFailure(decision.attemptStatus),
    provider: result.provider,
    error: decision.lastError,
  });

  return {
    status: 'skipped',
    reason:
      decision.attemptStatus === 'RETRY_SCHEDULED'
        ? 'whatsapp_delivery_retry_scheduled'
        : 'whatsapp_delivery_failed',
  };
}

export async function handleWhatsAppWebhookProcessing(
  job: WorkerJob,
  ports: WhatsAppWebhookProcessingPorts,
): Promise<WorkerJobHandlerResult> {
  const payload = whatsappWebhookEventPayloadSchema.parse(job.payload);
  if (payload.tenantId !== job.tenantId) return { status: 'skipped', reason: 'tenant_mismatch' };
  if (payload.branchId && job.branchId && payload.branchId !== job.branchId) {
    return { status: 'skipped', reason: 'branch_mismatch' };
  }

  const rawEvent = await ports.messaging.findRawProviderEventById(payload.rawProviderEventId);
  if (!rawEvent || rawEvent.tenantId !== job.tenantId) {
    return { status: 'skipped', reason: 'raw_provider_event_not_found' };
  }
  if (rawEvent.processedAt)
    return { status: 'skipped', reason: 'raw_provider_event_already_processed' };

  if (payload.eventKind === 'INBOUND_MESSAGE' || payload.eventKind === 'OPT_OUT') {
    const contactPhoneHash = stringMetadata(rawEvent.payload.fromPhoneHash);
    if (!contactPhoneHash) return { status: 'skipped', reason: 'inbound_contact_missing' };
    await ports.messaging.recordInboundMessage({
      tenantId: rawEvent.tenantId,
      branchId: rawEvent.branchId,
      connectionId: rawEvent.connectionId,
      providerMessageId: stringMetadata(rawEvent.payload.providerMessageId),
      contactPhoneHash,
      bodyPreview: stringMetadata(rawEvent.payload.textPreview),
      rawText: stringMetadata(rawEvent.payload.textPreview),
      receivedAt: payload.receivedAt,
      payload: rawEvent.payload,
    });
  } else if (payload.eventKind === 'OUTBOUND_STATUS' || payload.eventKind === 'TEMPLATE_STATUS') {
    const providerMessageId = stringMetadata(rawEvent.payload.providerMessageId);
    const deliveryState = deliveryStateMetadata(rawEvent.payload.deliveryState);
    if (!providerMessageId || !deliveryState) {
      return { status: 'skipped', reason: 'provider_status_missing' };
    }
    await ports.messaging.recordProviderStatus({
      tenantId: rawEvent.tenantId,
      branchId: rawEvent.branchId,
      connectionId: rawEvent.connectionId,
      providerMessageId,
      deliveryState,
      providerEventId: rawEvent.providerEventId,
      occurredAt: stringMetadata(rawEvent.payload.occurredAt) ?? payload.receivedAt,
      payload: rawEvent.payload,
    });
  } else {
    return { status: 'skipped', reason: 'provider_event_kind_unsupported' };
  }

  await ports.messaging.markRawProviderEventProcessed(
    rawEvent.id,
    (ports.now?.() ?? new Date()).toISOString(),
  );
  return { status: 'succeeded', effect: 'whatsapp_webhook_processed' };
}

async function recordNotificationAttemptIfNeeded(
  job: WorkerJob,
  ports: WhatsAppDeliveryPorts,
  payload: WhatsAppDeliveryPayload,
  attempt: Omit<
    RecordNotificationDeliveryAttemptCommand,
    'tenantId' | 'branchId' | 'notificationIntentId' | 'channel' | 'attemptNumber'
  >,
) {
  if (!payload.notificationIntentId || !ports.notifications) return;
  await ports.notifications.recordDeliveryAttempt({
    tenantId: job.tenantId,
    branchId: payload.branchId ?? job.branchId,
    notificationIntentId: payload.notificationIntentId,
    channel: 'WHATSAPP',
    attemptNumber: job.attemptCount + 1,
    ...attempt,
  });
}

function notificationAttemptStatusFromFailure(
  status: WorkerJobAttemptStatus,
): NotificationDeliveryAttemptStatus {
  if (status === 'RETRY_SCHEDULED') return 'RETRY_SCHEDULED';
  if (status === 'DEAD_LETTERED') return 'DEAD_LETTERED';
  return 'FAILED';
}

function notificationAttemptStatusFromDeliveryState(
  state: MessageDeliveryState,
): NotificationDeliveryAttemptStatus {
  if (state === 'RECEIVED') return 'QUEUED';
  return state;
}

function workerResultFromDeliveryAttemptStatus(
  status: NotificationDeliveryAttemptStatus,
): WorkerJobHandlerResult {
  if (status === 'QUEUED') return { status: 'succeeded', effect: 'whatsapp_delivery_queued' };
  if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
    return { status: 'succeeded', effect: 'whatsapp_delivered' };
  }
  if (status === 'SKIPPED') return { status: 'skipped', reason: 'whatsapp_delivery_skipped' };
  if (status === 'BLOCKED_BY_CONSENT') {
    return { status: 'skipped', reason: 'whatsapp_delivery_blocked_by_consent' };
  }
  return { status: 'skipped', reason: 'whatsapp_delivery_failed' };
}

function deliveryAttemptStatusFromEligibilityDecision(
  decision: WhatsAppDeliveryEligibilityDecision,
): NotificationDeliveryAttemptStatus {
  if (decision.reason === 'NO_DESTINATION') return 'SKIPPED';
  return 'BLOCKED_BY_CONSENT';
}

function isFinalDeliveryAttempt(status: NotificationDeliveryAttemptStatus) {
  return (
    status === 'QUEUED' ||
    status === 'SENT' ||
    status === 'DELIVERED' ||
    status === 'READ' ||
    status === 'SKIPPED' ||
    status === 'BLOCKED_BY_CONSENT' ||
    status === 'DEAD_LETTERED'
  );
}

function stringMetadata(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function deliveryStateMetadata(value: unknown): MessageDeliveryState | undefined {
  if (
    value === 'QUEUED' ||
    value === 'SENT' ||
    value === 'DELIVERED' ||
    value === 'READ' ||
    value === 'FAILED' ||
    value === 'SKIPPED' ||
    value === 'BLOCKED_BY_CONSENT'
  ) {
    return value;
  }
  return undefined;
}
