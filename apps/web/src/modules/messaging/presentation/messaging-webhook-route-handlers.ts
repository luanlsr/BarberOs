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
          return NextResponse.json({
            data: { accepted: true, events: 0, enqueued: 0 },
            requestId,
          });
        }

        let enqueued = 0;
        for (const event of events) {
          if (isStaleEvent(event, receivedAt, dependencies.maxEventAgeMs)) {
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
            return jsonError(
              'MESSAGING_VALIDATION_ERROR',
              'Messaging connection was not found.',
              404,
              requestId,
            );
          }

          const context = await dependencies.resolveContextForEvent(connection, event);
          if (!context) {
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

        return NextResponse.json({
          data: { accepted: true, events: events.length, enqueued },
          requestId,
        });
      } catch (error) {
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
