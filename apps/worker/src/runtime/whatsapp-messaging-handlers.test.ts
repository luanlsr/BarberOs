import type {
  NotificationDeliveryAttempt,
  RawMessagingProviderEvent,
  WorkerJob,
} from '@barberos/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  handleWhatsAppDelivery,
  handleWhatsAppWebhookProcessing,
  type ProcessInboundMessageCommand,
  type ProcessProviderStatusCommand,
  type WhatsAppProviderAdapter,
} from './whatsapp-messaging-handlers';

describe('WhatsApp worker handlers', () => {
  it('sends outbound WhatsApp delivery and records queued notification attempts', async () => {
    const attempts: NotificationDeliveryAttempt[] = [];
    const provider: WhatsAppProviderAdapter = {
      provider: 'LOCAL',
      send: vi.fn(async () => ({
        accepted: true as const,
        provider: 'LOCAL',
        providerMessageId: 'local-message-1',
        deliveryState: 'QUEUED' as const,
        retryable: false as const,
      })),
    };

    const result = await handleWhatsAppDelivery(makeDeliveryJob(), {
      provider,
      notifications: notificationPorts(attempts),
      now: () => new Date('2026-09-23T12:05:00.000Z'),
    });

    expect(result).toEqual({ status: 'succeeded', effect: 'whatsapp_delivery_queued' });
    expect(provider.send).toHaveBeenCalledWith(makeDeliveryPayload());
    expect(attempts).toEqual([
      expect.objectContaining({
        notificationIntentId: 'notification-1',
        channel: 'WHATSAPP',
        status: 'QUEUED',
        provider: 'LOCAL',
        providerMessageId: 'local-message-1',
        sentAt: '2026-09-23T12:05:00.000Z',
      }),
    ]);
  });

  it('records retry and dead-letter attempts through the worker retry policy', async () => {
    const retryAttempts: NotificationDeliveryAttempt[] = [];
    const retry = await handleWhatsAppDelivery(makeDeliveryJob({ attemptCount: 1 }), {
      provider: failingProvider(true),
      notifications: notificationPorts(retryAttempts),
      now: () => new Date('2026-09-23T12:05:00.000Z'),
    });

    const deadLetterAttempts: NotificationDeliveryAttempt[] = [];
    const deadLetter = await handleWhatsAppDelivery(
      makeDeliveryJob({ attemptCount: 7, maxAttempts: 8 }),
      {
        provider: failingProvider(true),
        notifications: notificationPorts(deadLetterAttempts),
        now: () => new Date('2026-09-23T12:05:00.000Z'),
      },
    );

    expect(retry).toEqual({ status: 'skipped', reason: 'whatsapp_delivery_retry_scheduled' });
    expect(retryAttempts[0]).toMatchObject({
      status: 'RETRY_SCHEDULED',
      attemptNumber: 2,
      error: { code: 'WORKER_PROVIDER_UNAVAILABLE', retryable: true },
    });
    expect(deadLetter).toEqual({ status: 'skipped', reason: 'whatsapp_delivery_failed' });
    expect(deadLetterAttempts[0]).toMatchObject({
      status: 'DEAD_LETTERED',
      attemptNumber: 8,
      error: { code: 'WORKER_RETRY_EXHAUSTED', retryable: false },
    });
  });

  it('processes inbound raw webhook events into conversations and marks them processed', async () => {
    const inbound: ProcessInboundMessageCommand[] = [];
    const processed: string[] = [];

    const result = await handleWhatsAppWebhookProcessing(makeWebhookJob(), {
      messaging: {
        async findRawProviderEventById() {
          return rawProviderEvent();
        },
        async recordInboundMessage(command) {
          inbound.push(command);
        },
        async recordProviderStatus() {
          throw new Error('Unexpected status update.');
        },
        async markRawProviderEventProcessed(id) {
          processed.push(id);
        },
      },
      now: () => new Date('2026-09-23T12:06:00.000Z'),
    });

    expect(result).toEqual({ status: 'succeeded', effect: 'whatsapp_webhook_processed' });
    expect(inbound).toEqual([
      expect.objectContaining({
        tenantId: 'tenant-1',
        branchId: 'branch-1',
        connectionId: 'connection-1',
        providerMessageId: 'provider-message-1',
        contactPhoneHash: 'hash-5511999999999',
        bodyPreview: 'Sair',
        rawText: 'Sair',
      }),
    ]);
    expect(processed).toEqual(['raw-event-1']);
  });

  it('processes outbound provider status events idempotently', async () => {
    const statuses: ProcessProviderStatusCommand[] = [];
    const processed: string[] = [];

    const result = await handleWhatsAppWebhookProcessing(
      makeWebhookJob({ eventKind: 'OUTBOUND_STATUS' }),
      {
        messaging: {
          async findRawProviderEventById() {
            return rawProviderEvent({
              eventKind: 'OUTBOUND_STATUS',
              payload: {
                providerMessageId: 'provider-message-1',
                deliveryState: 'DELIVERED',
                occurredAt: '2026-09-23T12:03:00.000Z',
              },
            });
          },
          async recordInboundMessage() {
            throw new Error('Unexpected inbound message.');
          },
          async recordProviderStatus(command) {
            statuses.push(command);
          },
          async markRawProviderEventProcessed(id) {
            processed.push(id);
          },
        },
      },
    );

    expect(result).toEqual({ status: 'succeeded', effect: 'whatsapp_webhook_processed' });
    expect(statuses).toEqual([
      expect.objectContaining({
        providerMessageId: 'provider-message-1',
        deliveryState: 'DELIVERED',
        providerEventId: 'provider-event-1',
      }),
    ]);
    expect(processed).toEqual(['raw-event-1']);
  });

  it('skips already processed raw provider events', async () => {
    const result = await handleWhatsAppWebhookProcessing(makeWebhookJob(), {
      messaging: {
        async findRawProviderEventById() {
          return rawProviderEvent({ processedAt: '2026-09-23T12:06:00.000Z' });
        },
        async recordInboundMessage() {
          throw new Error('Unexpected inbound message.');
        },
        async recordProviderStatus() {
          throw new Error('Unexpected status update.');
        },
        async markRawProviderEventProcessed() {
          throw new Error('Unexpected processed mark.');
        },
      },
    });

    expect(result).toEqual({ status: 'skipped', reason: 'raw_provider_event_already_processed' });
  });
});

function notificationPorts(attempts: NotificationDeliveryAttempt[]) {
  return {
    async recordDeliveryAttempt(command: Omit<NotificationDeliveryAttempt, 'id' | 'createdAt'>) {
      attempts.push({
        id: 'attempt-' + (attempts.length + 1),
        createdAt: '2026-09-23T12:05:00.000Z',
        ...command,
      });
    },
  };
}

function failingProvider(retryable: boolean): WhatsAppProviderAdapter {
  return {
    provider: 'LOCAL',
    async send() {
      return {
        accepted: false,
        provider: 'LOCAL',
        deliveryState: 'FAILED',
        retryable,
        error: {
          code: retryable ? 'WORKER_PROVIDER_UNAVAILABLE' : 'NOTIFICATION_DELIVERY_FAILED',
          message: 'Provider failure.',
          retryable,
        },
      };
    },
  };
}

function makeDeliveryPayload() {
  return {
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    connectionId: 'connection-1',
    notificationIntentId: 'notification-1',
    recipientPhoneHash: 'hash-5511999999999',
    templateKey: 'appointment.reminder.v1',
    variables: { customerName: 'Ana' },
    idempotencyKey: 'whatsapp-delivery-1',
    correlationId: 'correlation-1',
  };
}

function makeDeliveryJob(input: { attemptCount?: number; maxAttempts?: number } = {}): WorkerJob {
  return {
    id: 'job-whatsapp-delivery',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: 'WHATSAPP_DELIVERY',
    status: 'RUNNING',
    schemaVersion: 1,
    sourceType: 'NOTIFICATION_INTENT',
    sourceId: 'notification-1',
    notificationIntentId: 'notification-1',
    payload: makeDeliveryPayload(),
    idempotencyKey: 'job:whatsapp-delivery',
    correlationId: 'correlation-1',
    priority: 85,
    attemptCount: input.attemptCount ?? 0,
    maxAttempts: input.maxAttempts ?? 8,
    runAt: '2026-09-23T12:00:00.000Z',
    createdAt: '2026-09-23T12:00:00.000Z',
    updatedAt: '2026-09-23T12:00:00.000Z',
  };
}

function makeWebhookJob(
  input: { eventKind?: WorkerJob['payload'] extends infer _ ? string : never } = {},
): WorkerJob {
  return {
    id: 'job-webhook-processing',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    type: 'MESSAGING_WEBHOOK_PROCESSING',
    status: 'RUNNING',
    schemaVersion: 1,
    sourceType: 'MESSAGING_PROVIDER_EVENT',
    sourceId: 'raw-event-1',
    payload: {
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      connectionId: 'connection-1',
      rawProviderEventId: 'raw-event-1',
      providerEventId: 'provider-event-1',
      eventKind: input.eventKind ?? 'INBOUND_MESSAGE',
      receivedAt: '2026-09-23T12:05:00.000Z',
      idempotencyKey: 'whatsapp-webhook:connection-1:LOCAL:provider-event-1',
      correlationId: 'correlation-1',
    },
    idempotencyKey: 'job:webhook-processing',
    correlationId: 'correlation-1',
    priority: 85,
    attemptCount: 0,
    maxAttempts: 8,
    runAt: '2026-09-23T12:00:00.000Z',
    createdAt: '2026-09-23T12:00:00.000Z',
    updatedAt: '2026-09-23T12:00:00.000Z',
  };
}

function rawProviderEvent(
  overrides: Partial<RawMessagingProviderEvent> = {},
): RawMessagingProviderEvent {
  return {
    id: 'raw-event-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    connectionId: 'connection-1',
    provider: 'LOCAL',
    providerEventId: 'provider-event-1',
    eventKind: 'INBOUND_MESSAGE',
    receivedAt: '2026-09-23T12:05:00.000Z',
    idempotencyKey: 'whatsapp-webhook:connection-1:LOCAL:provider-event-1',
    payload: {
      providerMessageId: 'provider-message-1',
      fromPhoneHash: 'hash-5511999999999',
      textPreview: 'Sair',
      occurredAt: '2026-09-23T12:05:00.000Z',
    },
    signatureValid: true,
    ...overrides,
  };
}
