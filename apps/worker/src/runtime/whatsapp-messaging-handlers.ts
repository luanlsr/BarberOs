import type {
  MessageDeliveryState,
  NotificationDeliveryAttemptStatus,
  WorkerJobAttemptStatus,
  RawMessagingProviderEvent,
  RecordNotificationDeliveryAttemptCommand,
  WhatsAppDeliveryPayload,
  WhatsAppWebhookEventPayload,
  WorkerJob,
  WorkerSanitizedError,
} from '@barberos/contracts';
import {
  whatsappDeliveryPayloadSchema,
  whatsappWebhookEventPayloadSchema,
} from '@barberos/contracts';

import { decideWorkerJobFailure } from './job-retry-policy';
import type { WorkerJobHandlerResult } from './initial-handlers';

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

export type WhatsAppDeliveryPorts = {
  provider: WhatsAppProviderAdapter;
  notifications?: {
    recordDeliveryAttempt(command: RecordNotificationDeliveryAttemptCommand): Promise<unknown>;
  };
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
  const result = await ports.provider.send(payload);
  if (result.accepted) {
    await recordNotificationAttemptIfNeeded(job, ports, payload, {
      status: notificationAttemptStatusFromDeliveryState(result.deliveryState),
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      sentAt: now.toISOString(),
    });
    return {
      status: 'succeeded',
      effect: result.deliveryState === 'QUEUED' ? 'whatsapp_delivery_queued' : 'whatsapp_delivered',
    };
  }

  const decision = decideWorkerJobFailure({
    job,
    error: result.error,
    now,
    retryAfterMs: result.retryAfterMs,
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
