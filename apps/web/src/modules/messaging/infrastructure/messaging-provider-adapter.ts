import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
  MessageDeliveryState,
  MessagingEventKind,
  MessagingProvider,
  WhatsAppDeliveryPayload,
  WorkerSanitizedError,
} from '@barberos/contracts';

export type MessagingProviderSendResult = {
  accepted: boolean;
  provider: MessagingProvider;
  providerMessageId?: string;
  deliveryState: MessageDeliveryState;
  retryable: boolean;
  error?: WorkerSanitizedError;
};

export type MessagingWebhookVerificationInput = {
  body: string;
  headers: Headers;
  receivedAt: Date;
};

export type NormalizedMessagingProviderEvent = {
  provider: MessagingProvider;
  providerEventId: string;
  eventKind: MessagingEventKind;
  providerMessageId?: string;
  fromPhoneHash?: string;
  textPreview?: string;
  deliveryState?: MessageDeliveryState;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export interface MessagingProviderAdapter {
  readonly provider: MessagingProvider;
  send(input: WhatsAppDeliveryPayload): Promise<MessagingProviderSendResult>;
  verifyWebhook(input: MessagingWebhookVerificationInput): Promise<boolean> | boolean;
  normalizeWebhook(body: unknown, receivedAt: Date): NormalizedMessagingProviderEvent[];
}

export class LocalNoopMessagingProviderAdapter implements MessagingProviderAdapter {
  readonly provider = 'LOCAL' as const;

  async send(input: WhatsAppDeliveryPayload): Promise<MessagingProviderSendResult> {
    return {
      accepted: true,
      provider: this.provider,
      providerMessageId: 'local-noop:' + input.idempotencyKey,
      deliveryState: 'QUEUED',
      retryable: false,
    };
  }

  verifyWebhook() {
    return true;
  }

  normalizeWebhook(body: unknown, receivedAt: Date): NormalizedMessagingProviderEvent[] {
    const payload = isRecord(body) ? body : { body };
    return [
      {
        provider: this.provider,
        providerEventId: stringValue(payload.id) ?? 'local:' + receivedAt.toISOString(),
        eventKind: messagingEventKindValue(payload.eventKind),
        providerMessageId: stringValue(payload.providerMessageId),
        textPreview: stringValue(payload.text),
        occurredAt: receivedAt.toISOString(),
        payload,
      },
    ];
  }
}

export type MetaWhatsAppProviderOptions = {
  accessToken?: string;
  phoneNumberId?: string;
  appSecret: string;
  fetchImpl?: typeof fetch;
};

export class MetaWhatsAppProviderAdapter implements MessagingProviderAdapter {
  readonly provider = 'META_WHATSAPP_CLOUD' as const;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: MetaWhatsAppProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(input: WhatsAppDeliveryPayload): Promise<MessagingProviderSendResult> {
    if (!this.options.accessToken || !this.options.phoneNumberId) {
      return providerError('Messaging provider is not configured.', true);
    }

    const response = await this.fetchImpl(
      `https://graph.facebook.com/v20.0/${this.options.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: input.recipientPhoneHash,
          type: 'template',
          template: {
            name: input.templateKey,
            language: { code: 'pt_BR' },
            components: Object.keys(input.variables).length
              ? [
                  {
                    type: 'body',
                    parameters: Object.values(input.variables).map((value) => ({
                      type: 'text',
                      text: value,
                    })),
                  },
                ]
              : undefined,
          },
        }),
      },
    );

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const providerMessageId = firstProviderMessageId(body);
    if (response.ok && providerMessageId) {
      return {
        accepted: true,
        provider: this.provider,
        providerMessageId,
        deliveryState: 'QUEUED',
        retryable: false,
      };
    }

    return providerError('WhatsApp provider rejected the send request.', response.status >= 500);
  }

  verifyWebhook(input: MessagingWebhookVerificationInput) {
    const signature = input.headers.get('x-hub-signature-256');
    if (!signature?.startsWith('sha256=')) return false;
    const expected = createHmac('sha256', this.options.appSecret)
      .update(input.body, 'utf8')
      .digest('hex');
    return safeEqual(signature.slice('sha256='.length), expected);
  }

  normalizeWebhook(body: unknown, receivedAt: Date): NormalizedMessagingProviderEvent[] {
    if (!isRecord(body)) return [];
    const entries = Array.isArray(body.entry) ? body.entry : [];
    const events: NormalizedMessagingProviderEvent[] = [];
    for (const entry of entries) {
      if (!isRecord(entry)) continue;
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        if (!isRecord(change) || !isRecord(change.value)) continue;
        const value = change.value;
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const message of messages) {
          if (!isRecord(message)) continue;
          const text = isRecord(message.text) ? stringValue(message.text.body) : undefined;
          events.push({
            provider: this.provider,
            providerEventId: stringValue(message.id) ?? receivedAt.toISOString(),
            providerMessageId: stringValue(message.id),
            eventKind: 'INBOUND_MESSAGE',
            fromPhoneHash: stringValue(message.from),
            textPreview: text,
            occurredAt: stringValue(message.timestamp)
              ? new Date(Number(message.timestamp) * 1000).toISOString()
              : receivedAt.toISOString(),
            payload: value,
          });
        }
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const status of statuses) {
          if (!isRecord(status)) continue;
          events.push({
            provider: this.provider,
            providerEventId: stringValue(status.id) + ':' + stringValue(status.status),
            providerMessageId: stringValue(status.id),
            eventKind: 'OUTBOUND_STATUS',
            deliveryState: deliveryStateFromMetaStatus(stringValue(status.status)),
            occurredAt: stringValue(status.timestamp)
              ? new Date(Number(status.timestamp) * 1000).toISOString()
              : receivedAt.toISOString(),
            payload: value,
          });
        }
      }
    }
    return events;
  }
}

function providerError(message: string, retryable: boolean): MessagingProviderSendResult {
  return {
    accepted: false,
    provider: 'META_WHATSAPP_CLOUD',
    deliveryState: 'FAILED',
    retryable,
    error: {
      code: retryable ? 'WORKER_PROVIDER_UNAVAILABLE' : 'MESSAGING_VALIDATION_ERROR',
      message,
      retryable,
    },
  };
}

function deliveryStateFromMetaStatus(status?: string): MessageDeliveryState {
  if (status === 'sent') return 'SENT';
  if (status === 'delivered') return 'DELIVERED';
  if (status === 'read') return 'READ';
  if (status === 'failed') return 'FAILED';
  return 'QUEUED';
}

function firstProviderMessageId(body: Record<string, unknown>) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const first = messages[0];
  return isRecord(first) ? stringValue(first.id) : undefined;
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function messagingEventKindValue(value: unknown): MessagingEventKind {
  const eventKind = stringValue(value);
  if (
    eventKind === 'INBOUND_MESSAGE' ||
    eventKind === 'OUTBOUND_STATUS' ||
    eventKind === 'TEMPLATE_STATUS' ||
    eventKind === 'OPT_OUT'
  ) {
    return eventKind;
  }
  return 'UNKNOWN';
}
