import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import type {
  MessagingConnection,
  RawMessagingProviderEvent,
  RequestContext,
  WhatsAppWebhookEventPayload,
} from '@barberos/contracts';

import type { RecordProviderEventCommand } from '../domain';
import type {
  MessagingProviderAdapter,
  NormalizedMessagingProviderEvent,
} from '../infrastructure/messaging-provider-adapter';
import { jsonError, jsonFromError } from '../../shared/presentation/api';

export type MessagingWebhookRouteService = {
  recordProviderEvent(
    context: RequestContext,
    command: RecordProviderEventCommand,
  ): Promise<RawMessagingProviderEvent>;
};

export type MessagingWebhookRouteDependencies = {
  adapter: MessagingProviderAdapter;
  service: MessagingWebhookRouteService;
  resolveConnection(
    event: NormalizedMessagingProviderEvent,
  ): Promise<MessagingConnection | null> | MessagingConnection | null;
  resolveContextForEvent(
    connection: MessagingConnection,
    event: NormalizedMessagingProviderEvent,
  ): Promise<RequestContext | null> | RequestContext | null;
  enqueueWebhookProcessing(
    context: RequestContext,
    payload: WhatsAppWebhookEventPayload,
  ): Promise<void> | void;
  webhookVerifyToken?: string;
  maxEventAgeMs?: number;
  observability?: MessagingWebhookObservability;
};

export type MessagingWebhookObservability = {
  log?(entry: MessagingWebhookLogEntry): void;
  metric?(point: MessagingWebhookMetricPoint): void;
};

export type MessagingWebhookLogEntry = {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  module: 'messaging';
  event: string;
  requestId: string;
  tenantId?: string;
  branchId?: string;
  connectionId?: string;
  metadata?: Record<string, unknown>;
};

export type MessagingWebhookMetricPoint = {
  timestamp: string;
  module: 'messaging';
  name: string;
  value: number;
  unit: 'count';
  tags?: Record<string, string>;
};

const DEFAULT_MAX_EVENT_AGE_MS = 5 * 60 * 1000;

export function createMessagingWebhookRouteHandlers(
  dependencies: MessagingWebhookRouteDependencies,
) {
  return {
    GET: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? randomUUID();
      const url = new URL(request.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (
        mode === 'subscribe' &&
        challenge &&
        dependencies.webhookVerifyToken &&
        token === dependencies.webhookVerifyToken
      ) {
        return new NextResponse(challenge, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
      }

      return jsonError(
        'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
        'Webhook verification failed.',
        403,
        requestId,
      );
    },

    POST: async (request: Request) => {
      const requestId = request.headers.get('x-request-id') ?? randomUUID();
      const receivedAt = new Date();
      const receivedAtIso = receivedAt.toISOString();

      try {
        const bodyText = await request.text();
        const signatureValid = await dependencies.adapter.verifyWebhook({
          body: bodyText,
          headers: request.headers,
          receivedAt,
        });

        if (!signatureValid) {
          observeWebhook(dependencies, {
            level: 'warn',
            event: 'messaging.webhook.rejected',
            requestId,
            metric: 'messaging_webhook_rejected_total',
            tags: { reason: 'invalid_signature' },
          });
          return jsonError(
            'MESSAGING_WEBHOOK_SIGNATURE_INVALID',
            'Webhook signature is invalid.',
            401,
            requestId,
          );
        }

        const body = parseWebhookBody(bodyText);
        const events = dependencies.adapter.normalizeWebhook(body, receivedAt);
        if (!events.length) {
          observeWebhook(dependencies, {
            level: 'info',
            event: 'messaging.webhook.accepted',
            requestId,
            metric: 'messaging_webhook_accepted_total',
            tags: { eventCount: 0, enqueued: 0 },
          });
          return NextResponse.json({
            data: { accepted: true, events: 0, enqueued: 0 },
            requestId,
          });
        }

        let enqueued = 0;
        for (const event of events) {
          if (isStaleEvent(event, receivedAt, dependencies.maxEventAgeMs)) {
            observeWebhook(dependencies, {
              level: 'warn',
              event: 'messaging.webhook.rejected',
              requestId,
              metric: 'messaging_webhook_rejected_total',
              tags: {
                provider: event.provider,
                eventKind: event.eventKind,
                reason: 'stale_event',
              },
            });
            return jsonError(
              'MESSAGING_VALIDATION_ERROR',
              'Webhook event timestamp is stale.',
              400,
              requestId,
            );
          }

          const connection = await dependencies.resolveConnection(event);
          if (
            !connection ||
            connection.provider !== event.provider ||
            connection.status !== 'ACTIVE'
          ) {
            observeWebhook(dependencies, {
              level: 'warn',
              event: 'messaging.webhook.rejected',
              requestId,
              metric: 'messaging_webhook_rejected_total',
              tags: {
                provider: event.provider,
                eventKind: event.eventKind,
                reason: 'connection_not_found',
              },
            });
            return jsonError(
              'MESSAGING_VALIDATION_ERROR',
              'Messaging connection was not found.',
              404,
              requestId,
            );
          }

          const context = await dependencies.resolveContextForEvent(connection, event);
          if (!context) {
            observeWebhook(dependencies, {
              level: 'warn',
              event: 'messaging.webhook.rejected',
              requestId,
              tenantId: connection.tenantId,
              branchId: connection.branchId,
              connectionId: connection.id,
              metric: 'messaging_webhook_rejected_total',
              tags: {
                provider: event.provider,
                eventKind: event.eventKind,
                reason: 'permission_denied',
              },
            });
            return jsonError('MESSAGING_PERMISSION_DENIED', 'Permission denied.', 403, requestId);
          }

          const idempotencyKey = buildProviderEventIdempotencyKey(connection.id, event);
          const rawEvent = await dependencies.service.recordProviderEvent(context, {
            tenantId: connection.tenantId,
            branchId: connection.branchId,
            connectionId: connection.id,
            provider: event.provider,
            providerEventId: event.providerEventId,
            eventKind: event.eventKind,
            receivedAt: receivedAtIso,
            idempotencyKey,
            payload: {
              providerMessageId: event.providerMessageId,
              fromPhoneHash: event.fromPhoneHash,
              textPreview: event.textPreview,
              deliveryState: event.deliveryState,
              occurredAt: event.occurredAt,
              raw: event.payload,
            },
            signatureValid: true,
          });

          if (rawEvent.receivedAt === receivedAtIso) {
            await dependencies.enqueueWebhookProcessing(context, {
              tenantId: connection.tenantId,
              branchId: connection.branchId,
              connectionId: connection.id,
              rawProviderEventId: rawEvent.id,
              providerEventId: event.providerEventId,
              eventKind: event.eventKind,
              receivedAt: receivedAtIso,
              idempotencyKey,
              correlationId: requestId,
            });
            enqueued += 1;
          }
        }

        observeWebhook(dependencies, {
          level: 'info',
          event: 'messaging.webhook.accepted',
          requestId,
          metric: 'messaging_webhook_accepted_total',
          tags: { eventCount: events.length, enqueued },
        });
        observeWebhook(dependencies, {
          level: 'info',
          event: 'messaging.webhook.events_enqueued',
          requestId,
          metric: 'messaging_webhook_events_enqueued_total',
          tags: { eventCount: events.length, enqueued },
          value: enqueued,
        });
        return NextResponse.json({
          data: { accepted: true, events: events.length, enqueued },
          requestId,
        });
      } catch (error) {
        observeWebhook(dependencies, {
          level: 'error',
          event: 'messaging.webhook.rejected',
          requestId,
          metric: 'messaging_webhook_rejected_total',
          tags: { reason: 'handler_error' },
          metadata: {
            errorCode: error instanceof Error ? error.name : 'UNKNOWN',
          },
        });
        return jsonFromError(error, requestId);
      }
    },
  };
}

function parseWebhookBody(bodyText: string) {
  if (!bodyText.trim()) {
    throw new Error('Webhook payload is empty.');
  }
  return JSON.parse(bodyText) as unknown;
}

function isStaleEvent(
  event: NormalizedMessagingProviderEvent,
  receivedAt: Date,
  maxEventAgeMs = DEFAULT_MAX_EVENT_AGE_MS,
) {
  const occurredAt = new Date(event.occurredAt).getTime();
  if (!Number.isFinite(occurredAt)) return true;
  return receivedAt.getTime() - occurredAt > maxEventAgeMs;
}

function buildProviderEventIdempotencyKey(
  connectionId: string,
  event: NormalizedMessagingProviderEvent,
) {
  return ['whatsapp-webhook', connectionId, event.provider, event.providerEventId].join(':');
}

function observeWebhook(
  dependencies: MessagingWebhookRouteDependencies,
  input: {
    level: MessagingWebhookLogEntry['level'];
    event: string;
    requestId: string;
    tenantId?: string;
    branchId?: string;
    connectionId?: string;
    metric: string;
    value?: number;
    tags?: Record<string, string | number | boolean | undefined>;
    metadata?: Record<string, unknown>;
  },
) {
  const timestamp = new Date().toISOString();
  dependencies.observability?.log?.({
    timestamp,
    level: input.level,
    module: 'messaging',
    event: input.event,
    requestId: input.requestId,
    tenantId: input.tenantId,
    branchId: input.branchId,
    connectionId: input.connectionId,
    metadata: input.metadata,
  });
  dependencies.observability?.metric?.({
    timestamp,
    module: 'messaging',
    name: input.metric,
    value: input.value ?? 1,
    unit: 'count',
    tags: sanitizeWebhookMetricTags(input.tags),
  });
}

function sanitizeWebhookMetricTags(
  tags: Record<string, string | number | boolean | undefined> = {},
) {
  const sanitized = Object.fromEntries(
    Object.entries(tags)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value).slice(0, 120)]),
  );
  return Object.keys(sanitized).length ? sanitized : undefined;
}
